import test from 'node:test'
import assert from 'node:assert/strict'
import { canPurchasePlan } from '../billing/providers/index.js'
import { localTestAccessAllowed } from '../access.js'

const paid = { active: true, is_free: false, price_cents: 1290, sellable: false }

test('simulador local permite testar plano precificado mesmo com venda real fechada', () => {
  assert.equal(canPurchasePlan(paid, { BILLING_PROVIDER: 'simulado', NODE_ENV: 'development' }), true)
})

test('produção continua exigindo plano explicitamente vendável', () => {
  assert.equal(canPurchasePlan(paid, { BILLING_PROVIDER: 'simulado', NODE_ENV: 'production' }), false)
  assert.equal(canPurchasePlan({ ...paid, sellable: true }, { BILLING_PROVIDER: 'infinitepay', NODE_ENV: 'production' }), true)
})

test('plano grátis, inativo ou sem preço nunca vira contratação paga', () => {
  const env = { BILLING_PROVIDER: 'simulado', NODE_ENV: 'development' }
  assert.equal(canPurchasePlan({ ...paid, is_free: true }, env), false)
  assert.equal(canPurchasePlan({ ...paid, active: false }, env), false)
  assert.equal(canPurchasePlan({ ...paid, price_cents: null }, env), false)
})

test('acesso de QA só pode ser reconhecido pelo simulador fora de produção', () => {
  assert.equal(localTestAccessAllowed({ BILLING_PROVIDER: 'simulado', NODE_ENV: 'development' }), true)
  assert.equal(localTestAccessAllowed({ BILLING_PROVIDER: 'simulado', NODE_ENV: 'production' }), false)
  assert.equal(localTestAccessAllowed({ BILLING_PROVIDER: 'infinitepay', NODE_ENV: 'development' }), false)
})
