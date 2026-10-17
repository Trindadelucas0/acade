// Escolha do provedor so por variavel de ambiente (ver docs/v5/MONETIZACAO-V5.md):
//   BILLING_PROVIDER=simulado | asaas   (padrao: asaas se ASAAS_API_KEY existir, senao simulado)
import { simulado } from './simulado.js'
import { asaas, asaasConfig } from './asaas.js'
let cached = null
export function providerName(env = process.env) {
  if (env.BILLING_PROVIDER === 'simulado' || env.BILLING_PROVIDER === 'asaas') return env.BILLING_PROVIDER
  return env.ASAAS_API_KEY ? 'asaas' : 'simulado'
}
export function getProvider(env = process.env) {
  if (cached && env === process.env) return cached
  const name = providerName(env)
  let p
  if (name === 'asaas') {
    const cfg = asaasConfig(env)
    if (cfg.problems.length) throw new Error(`Configuração Asaas inválida: ${cfg.problems.join('; ')}`)
    p = asaas({ env })
  } else p = simulado()
  if (env === process.env) cached = p
  return p
}
export function resetProviderCache() { cached = null }
export function assertBillingConfig(env = process.env) { return getProvider(env) }
