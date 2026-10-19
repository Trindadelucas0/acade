import test from 'node:test'
import assert from 'node:assert/strict'
import { asaasConfig, asaas } from '../billing/providers/asaas.js'
import { getProvider, resetProviderCache } from '../billing/providers/index.js'

const token = 'w'.repeat(40)

test('Asaas exige chave, token de webhook forte e ambientes compatíveis', () => {
  assert.deepEqual(asaasConfig({ ASAAS_ENV: 'producao' }).problems.includes('ASAAS_API_KEY ausente'), true)
  assert.deepEqual(asaasConfig({ ASAAS_ENV: 'producao', ASAAS_API_KEY: '$aact_prod_x', ASAAS_WEBHOOK_TOKEN: 'curto' }).problems.some(x => x.includes('32 e 255')), true)
  assert.deepEqual(asaasConfig({ ASAAS_ENV: 'sandbox', ASAAS_API_KEY: '$aact_prod_x', ASAAS_WEBHOOK_TOKEN: token }).problems.some(x => x.includes('PRODUCAO')), true)
  assert.deepEqual(asaasConfig({ ASAAS_ENV: 'producao', ASAAS_API_KEY: '$aact_prod_x', ASAAS_WEBHOOK_TOKEN: token }).problems, [])
})

test('provedor Asaas incompleto falha fechado e não cai no simulador', () => {
  resetProviderCache()
  assert.throws(() => getProvider({ BILLING_PROVIDER: 'asaas', ASAAS_ENV: 'producao' }), /ASAAS_API_KEY ausente/)
})

test('Pix cria cobrança e busca QR Code sem expor a chave', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return { ok: true, json: async () => url.endsWith('/pixQrCode') ? { payload: 'pix-copia-cola', encodedImage: 'abc', expirationDate: '2026-10-18T12:00:00Z' } : { id: 'pay_1', status: 'PENDING' } }
  }
  const p = asaas({ env: { ASAAS_ENV: 'producao', ASAAS_API_KEY: '$aact_prod_example', ASAAS_WEBHOOK_TOKEN: token }, fetchImpl })
  const r = await p.createPix({ customerId: 'cus_1', amountCents: 1990, charge: { id: '00000000-0000-0000-0000-000000000001', description: 'Individual' }, dueDate: '2026-10-18' })
  assert.equal(r.status, 'pendente')
  assert.equal(r.pix.payload, 'pix-copia-cola')
  assert.equal(calls.length, 2)
  assert.equal(JSON.parse(calls[0].init.body).billingType, 'PIX')
  assert.equal(calls[0].init.headers.access_token, '$aact_prod_example')
})

test('cliente Asaas novo recebe CPF/CNPJ e cliente existente pode ter o documento corrigido', async () => {
  const calls = []
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ id: 'cus_1' }) } }
  const p = asaas({ env: { ASAAS_ENV: 'producao', ASAAS_API_KEY: '$aact_prod_example', ASAAS_WEBHOOK_TOKEN: token }, fetchImpl })
  await p.ensureCustomer({ id: 'user_1', name: 'Cliente', email: 'cliente@example.com' }, { cpfCnpj: '52998224725' })
  await p.updateCustomer('cus_1', { cpfCnpj: '11222333000181' })
  assert.equal(JSON.parse(calls[0].init.body).cpfCnpj, '52998224725')
  assert.equal(calls[1].init.method, 'PUT')
  assert.equal(calls[1].url.endsWith('/customers/cus_1'), true)
  assert.equal(JSON.parse(calls[1].init.body).cpfCnpj, '11222333000181')
})
