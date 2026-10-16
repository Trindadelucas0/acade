// Provedor Asaas (https://docs.asaas.com). Padrao = SANDBOX. Producao so com ASAAS_ENV=producao E chave de producao
// ($aact_prod_...). Chave de sandbox ($aact_hmlg_...) apontando para producao (ou o contrario) e recusada na partida.
// As renovacoes sao agendadas pelo AVAGYM (job de cobranca): cada periodo vira um POST /v3/payments com o token do
// cartao e externalReference = id da nossa cobranca (permite reconciliar sem cobrar duas vezes).
export const ASAAS_URLS = { sandbox: 'https://api-sandbox.asaas.com/v3', producao: 'https://api.asaas.com/v3' }
export function asaasConfig(env = process.env) {
  const mode = env.ASAAS_ENV === 'producao' ? 'producao' : 'sandbox'
  const key = env.ASAAS_API_KEY || ''
  const problems = []
  if (!key) problems.push('ASAAS_API_KEY ausente')
  if (mode === 'producao' && key && !key.startsWith('$aact_prod_')) problems.push('ASAAS_ENV=producao exige chave de producao ($aact_prod_...)')
  if (mode === 'sandbox' && key.startsWith('$aact_prod_')) problems.push('chave de PRODUCAO com ASAAS_ENV diferente de producao: recusada para evitar cobranca real')
  if (!env.ASAAS_WEBHOOK_TOKEN) problems.push('ASAAS_WEBHOOK_TOKEN ausente (webhooks seriam recusados)')
  return { mode, key, baseUrl: ASAAS_URLS[mode], problems, live: mode === 'producao' }
}
const brl = c => Math.round(c) / 100
const today = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)   // data de vencimento em horario de Brasilia
export function asaas({ env = process.env, fetchImpl = fetch } = {}) {
  const cfg = asaasConfig(env)
  async function call(method, path, body) {
    let r
    try {
      r = await fetchImpl(cfg.baseUrl + path, { method, signal: AbortSignal.timeout(20000),
        headers: { access_token: cfg.key, 'Content-Type': 'application/json', 'User-Agent': 'AVAGYM/5.0' }, body: body ? JSON.stringify(body) : undefined })
    } catch (e) { const x = new Error('Asaas indisponivel'); x.code = 'PROVIDER_UNAVAILABLE'; x.inconclusive = true; throw x }
    const data = await r.json().catch(() => ({}))
    if (!r.ok) { const er = data?.errors?.[0] || {}; const x = new Error(er.description || ('Asaas HTTP ' + r.status)); x.status = r.status; x.code = er.code || 'PROVIDER_ERROR'; x.inconclusive = r.status >= 500; throw x }
    return data
  }
  return {
    name: 'asaas', test: !cfg.live, live: cfg.live, mode: cfg.mode, label: cfg.live ? 'Asaas (producao)' : 'Asaas Sandbox (teste)', config: cfg,
    async ensureCustomer(user, holder) {
      const c = await call('POST', '/customers', { name: holder?.name || user.name, email: user.email, cpfCnpj: holder?.cpfCnpj, externalReference: user.id, notificationDisabled: true })
      return c.id
    },
    async tokenize({ customerId, card, holder, remoteIp }) {
      const [mm, yy] = [String(card.expMonth).padStart(2, '0'), String(card.expYear).length === 2 ? '20' + card.expYear : String(card.expYear)]
      try {
        const r = await call('POST', '/creditCard/tokenizeCreditCard', { customer: customerId, remoteIp,
          creditCard: { holderName: card.holderName, number: String(card.number).replace(/\D/g, ''), expiryMonth: mm, expiryYear: yy, ccv: card.cvv },
          creditCardHolderInfo: { name: holder.name, email: holder.email, cpfCnpj: holder.cpfCnpj, postalCode: holder.postalCode, addressNumber: holder.addressNumber, phone: holder.phone } })
        return { token: r.creditCardToken, brand: r.creditCardBrand, last4: r.creditCardNumber }
      } catch (e) { if (!e.inconclusive) e.code = 'CARD_INVALID'; throw e }
    },
    async charge({ token, customerId, amountCents, charge, split, remoteIp }) {
      try {
        const p = await call('POST', '/payments', { customer: customerId, billingType: 'CREDIT_CARD', value: brl(amountCents), dueDate: today(),
          description: 'AVAGYM - ' + (charge.description || 'assinatura'), externalReference: charge.id, creditCardToken: token, remoteIp,
          ...(split?.length ? { split } : {}) })
        const paid = ['CONFIRMED', 'RECEIVED'].includes(p.status)
        return { status: paid ? 'paga' : 'pendente', providerChargeId: p.id }
      } catch (e) {
        if (e.inconclusive) return { status: 'pendente', providerChargeId: null, inconclusive: true }
        return { status: 'recusada', providerChargeId: null, failure: { code: e.code, message: e.message } }
      }
    },
    // reconciliacao: consulta pela nossa referencia (evita cobranca duplicada depois de timeout)
    async getCharge(charge) {
      const p = charge.provider_charge_id ? await call('GET', '/payments/' + encodeURIComponent(charge.provider_charge_id))
        : (await call('GET', '/payments?externalReference=' + encodeURIComponent(charge.id))).data?.[0]
      if (!p) return null
      const map = { CONFIRMED: 'paga', RECEIVED: 'paga', RECEIVED_IN_CASH: 'paga', REFUNDED: 'estornada', REFUND_REQUESTED: 'estornada', CHARGEBACK_REQUESTED: 'estornada', OVERDUE: 'recusada', PENDING: 'pendente', AWAITING_RISK_ANALYSIS: 'pendente' }
      return { status: map[p.status] || 'pendente', providerChargeId: p.id }
    },
    async refund(charge) { await call('POST', `/payments/${encodeURIComponent(charge.provider_charge_id)}/refund`, {}); return { ok: true } }
  }
}
