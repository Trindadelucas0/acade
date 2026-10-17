// Provedor SIMULADO de cobranca (ambiente de teste). Nada e cobrado; tudo que sai daqui leva test=true e a interface
// mostra "Ambiente de teste". Os cartoes de teste definem o resultado (mesma ideia do Sandbox do Asaas):
//   4242 4242 4242 4242 / 4444 4444 4444 4444  -> aprova sempre
//   4000 0000 0000 0002 / 5184 0197 4037 3151 / 4916 5613 5824 0741 -> recusa sempre
//   4000 0000 0000 0341 -> aprova a primeira cobranca e recusa as seguintes (testa renovacao recusada, retentativa e carencia)
import crypto from 'node:crypto'
export const SIM_CARDS = {
  aprova: ['4242424242424242', '4444444444444444'],
  recusa: ['4000000000000002', '5184019740373151', '4916561358240741'],
  recusa_renovacao: ['4000000000000341']
}
const outcomeOf = n => Object.entries(SIM_CARDS).find(([, l]) => l.includes(n))?.[0] || null
export function simulado() {
  const qrImage = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><rect width="220" height="220" fill="white"/><rect x="20" y="20" width="180" height="180" fill="none" stroke="black" stroke-width="12"/><text x="110" y="116" text-anchor="middle" font-family="sans-serif" font-size="18">PIX TESTE</text></svg>`).toString('base64')
  return {
    name: 'simulado', test: true, live: false, label: 'Simulador de pagamentos (teste)',
    async ensureCustomer(user) { return 'sim_cus_' + String(user.id).replace(/-/g, '').slice(0, 16) },
    async tokenize({ card }) {
      const n = String(card.number || '').replace(/\D/g, '')
      const o = outcomeOf(n)
      if (!o) { const e = new Error('No ambiente de teste use um dos cartoes de teste listados na tela.'); e.code = 'CARD_INVALID'; throw e }
      return { token: `sim_${o}_${crypto.randomBytes(8).toString('hex')}`, brand: n.startsWith('4') ? 'VISA' : 'MASTERCARD', last4: n.slice(-4) }
    },
    // cobra um valor com o token. Devolve { status: 'paga'|'recusada', providerChargeId, failure? }
    async charge({ token, amountCents, charge, attemptIndex }) {
      const kind = /^sim_([a-z_]+)_[0-9a-f]+$/.exec(token || '')?.[1]
      const id = 'sim_pay_' + charge.id.replace(/-/g, '').slice(0, 20)
      const approve = kind === 'aprova' || (kind === 'recusa_renovacao' && charge.kind === 'primeira' && attemptIndex === 0)
      if (amountCents === 0 || approve) return { status: 'paga', providerChargeId: id }
      return { status: 'recusada', providerChargeId: id, failure: { code: 'card_declined', message: 'Transacao nao autorizada pelo emissor (simulado).' } }
    },
    async createPix({ charge }) {
      return { status: 'pendente', providerChargeId: 'sim_pix_' + charge.id.replace(/-/g, '').slice(0, 20),
        pix: { payload: 'PIX-SIMULADO-' + charge.id, encodedImage: 'data:image/svg+xml;base64,' + qrImage, expiresAt: new Date(Date.now() + 864e5).toISOString() } }
    },
    async getCharge() { return null },          // simulador e sincrono: nada a reconciliar no provedor
    async refund() { return { ok: true } },
    async cancelCharge() { return { ok: true } },
    // formato de webhook igual ao do Asaas, para exercitar o mesmo caminho idempotente
    eventFor(type, charge, providerChargeId) {
      return { id: `evt_sim_${type}_${providerChargeId}`, event: type, payment: { id: providerChargeId, value: charge.amount_cents / 100, externalReference: charge.id, billingType: 'CREDIT_CARD' } }
    }
  }
}
