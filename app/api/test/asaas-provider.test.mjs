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

test('provedor Asaas deixa até resposta CONFIRMED pendente para aguardar o webhook', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return { ok: true, json: async () => ({ id: 'pay_1', status: 'CONFIRMED' }) }
  }
  const p = asaas({ env: { ASAAS_ENV: 'producao', ASAAS_API_KEY: '$aact_prod_example', ASAAS_WEBHOOK_TOKEN: token }, fetchImpl })
  const r = await p.charge({ customerId: 'cus_1', token: 'tok_1', amountCents: 1990, charge: { id: '00000000-0000-0000-0000-000000000001', description: 'Individual' } })
  assert.equal(r.status, 'pendente')
  assert.equal(calls.length, 1)
  assert.equal(JSON.parse(calls[0].init.body).billingType, 'CREDIT_CARD')
  assert.equal(calls[0].init.headers.access_token, '$aact_prod_example')
  assert.equal('createPix' in p, false)
  assert.equal('updateCustomer' in p, false)
})

test('cliente Asaas recebe apenas nome e e-mail para tokenizar o cartão', async () => {
  const calls = []
  const fetchImpl = async (url, init) => { calls.push({ url, init }); return { ok: true, json: async () => ({ id: 'cus_1' }) } }
  const p = asaas({ env: { ASAAS_ENV: 'producao', ASAAS_API_KEY: '$aact_prod_example', ASAAS_WEBHOOK_TOKEN: token }, fetchImpl })
  await p.ensureCustomer({ id: 'user_1', name: 'Cliente', email: 'cliente@example.com' })
  assert.equal(calls.length, 1)
  assert.deepEqual(JSON.parse(calls[0].init.body), { name: 'Cliente', email: 'cliente@example.com', externalReference: 'user_1', notificationDisabled: true })
})
