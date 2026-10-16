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
    // configuracao perigosa ou incompleta: nao sobe cobranca real; cai no simulador e avisa no painel
    p = cfg.problems.filter(x => !x.startsWith('ASAAS_WEBHOOK_TOKEN')).length ? { ...simulado(), fallbackReason: cfg.problems.join('; ') } : asaas({ env })
    if (p.name === 'asaas' && cfg.problems.length) p.warnings = cfg.problems
  } else p = simulado()
  if (env === process.env) cached = p
  return p
}
export function resetProviderCache() { cached = null }
