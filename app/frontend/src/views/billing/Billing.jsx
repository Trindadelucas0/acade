import Brand from '../../components/Brand.jsx'
// V5 cobranca: pagina de planos (publica e no app), checkout com cartao, gestao da assinatura.
// Todo estado e regra ficam no servidor (/api/billing, /api/public/plans); aqui so exibimos e enviamos.
import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api.js'
import { ask, askText } from '../../lib/dialog.js'
import Icon from '../../components/Icon.jsx'
import { useStore } from '../../store/useStore.js'
import './billing.css'
import ReferralPanel from './Referral.jsx'   // Monetizacao F5
import { TrialCard, accessChanged } from './Access.jsx'   // Monetizacao F8
import { PlanGrid, TrialSeal, Faq } from './PlansShowcase.jsx'   // redesenho dos planos

export const FEAT = {
  receber_ficha_profissional: 'Treinos do seu personal',
  prescrever: 'Prescrever treinos para alunos', convidar_alunos: 'Convidar alunos', construtor_treino: 'Construtor de treinos',
  fichas_publicas: 'Publicar fichas na biblioteca pública',
  treino_pessoal: 'Treino pessoal e treino livre', programas_guiados: 'Programas guiados', execucao: 'Execução guiada com cronômetro', progresso: 'Progresso e histórico', ranking: 'Ranking', desafios_oficiais: 'Desafios oficiais'
}
const FOR = { aluno: 'Para alunos', profissional: 'Para personal trainers' }
// 3 planos no catalogo: Gratis (um por tipo de conta), Individual (aluno) e PRO (profissional)
export function catalog(plans, audiences) {
  const has = a => !audiences || audiences.includes(a)
  const free = plans.find(p => p.id === (has('aluno') ? 'aluno_free' : 'profissional_free'))
  return [free, ...plans.filter(p => !p.is_free && has(p.audience))].filter(Boolean)
}
const AUD = { aluno: 'Para alunos', profissional: 'Para profissionais' }
export const brl = c => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dBR = d => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
const post = (p, b) => api(p, { method: 'POST', body: JSON.stringify(b || {}) })

// cards dos planos (redesenho): sem tabela comparativa; cta(plan) devolve o botao de cada plano
export function PlansCompare({ plans, cta, current = {}, testMode, initialAud }) {
  return <div className="bl-wrap" data-testid="plans-compare">
    {testMode && <p className="bl-test" data-testid="billing-test-banner"><Icon name="info" /> Ambiente de teste: nenhum valor real é cobrado.</p>}
    <PlanGrid plans={plans} cta={cta} current={current} initialAud={initialAud} />
    <p className="pl-note">Cobrança mensal por cartão de crédito ou Pix. Cancele quando quiser: o acesso continua até o fim do período pago e seus dados ficam salvos.</p>
  </div>
}

// ===== pagina publica (sem login) =====
export function PublicPlans() {
  const [d, setD] = useState(null), [err, setErr] = useState(null)
  useEffect(() => { api('/api/public/plans').then(setD).catch(e => setErr(e.message)) }, [])
  const authed = !!useStore(s => s.user)
  const cta = p => !p.purchasable ? <span className="pl-btn" aria-disabled="true" data-testid={'cta-' + p.id}>Em breve</span>
    : <a className="pl-btn" data-testid={'cta-' + p.id} href={authed ? '#/assinatura?plano=' + p.id : '#/?cadastro=1&plano=' + p.id}>{authed ? 'Assinar o ' + p.name : 'Começar com o ' + p.name}<Icon name="bolt" /></a>
  return <div className="bl-page" data-testid="public-plans">
    <header className="pl-hero"><a href="#/" className="bl-logo"><Brand /></a>
      <h1>Treine com método.<br /><em>Evolua de verdade.</em></h1>
      <p>Um plano para quem treina, outro para quem prescreve. Cupons podem oferecer desconto na contratação; o acesso começa após a confirmação do pagamento.</p>
      <TrialSeal /></header>
    {err ? <p className="bl-err">{err}</p> : !d ? <p className="bl-load">Carregando planos…</p> : <>
      <PlansCompare plans={d.plans} testMode={d.test_mode} cta={cta} />
      <div className="pl-trust"><span><Icon name="shield" /> Pagamento seguro</span><span><Icon name="xmark" /> Cancele quando quiser</span><span><Icon name="lock" /> Seus dados ficam salvos</span></div>
      <p className="pl-note"><a href={authed ? '#/assinatura' : '#/?cadastro=1'} data-testid="have-coupon">Tenho um cupom ou código de indicação</a></p>
      <Faq /></>}
    <footer className="bl-foot"><a href="#/legal/termos">Termos de Uso</a> · <a href="#/legal/privacidade">Privacidade</a> · <a href="#/legal/assinatura">Termos de assinatura</a></footer>
  </div>
}

// ===== checkout =====
function Checkout({ plan, cfg, cards, onClose, onDone }) {
  const [paymentType, setPaymentType] = useState('card')
  const [useCard, setUseCard] = useState(cards[0]?.id || 'novo')
  const [f, setF] = useState({ number: '', holder_name: '', exp: '', cvv: '', cpf: '', customer_document: '', postal_code: '', address_number: '', phone: '' })
  const [coupon, setCoupon] = useState(''), [cv, setCv] = useState(null)
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(null)
  const [pix, setPix] = useState(null)
  const paidHandled = useRef(false)
  const newKey = () => crypto.randomUUID?.() || String(Date.now() + Math.random())
  const [idem, setIdem] = useState(newKey)   // BUG-031: uma chave por tentativa (duplo clique nao cobra 2x; nova tentativa usa chave nova)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const price = cv?.valid && cv.benefit === 'desconto' ? Math.round(plan.price_cents * (1 - cv.discount_pct / 100)) : plan.price_cents
  async function checkCoupon() { if (!coupon.trim()) return; try { setCv(await post('/api/billing/coupon/validate', { code: coupon.trim() })) } catch (e) { setCv({ valid: false, error: e.message }) } }
  async function pay(e) {
    e.preventDefault(); setBusy(true); setMsg(null)
    try {
      let card_id = paymentType === 'card' ? useCard : null
      if (paymentType === 'card' && useCard === 'novo') {
        const [mm, yy] = f.exp.split('/').map(s => s.trim())
        const r = await post('/api/billing/cards', { number: f.number, holder_name: f.holder_name, exp_month: mm, exp_year: yy, cvv: f.cvv,
          holder: cfg.requires_holder_info ? { cpf: f.cpf, postal_code: f.postal_code, address_number: f.address_number, phone: f.phone } : undefined })
        card_id = r.card.id
      }
      const r = await post('/api/billing/subscribe', { plan_id: plan.id, payment_type: paymentType, card_id,
        customer_document: paymentType === 'pix' ? f.customer_document : undefined,
        coupon: cv?.valid && cv.benefit === 'desconto' ? coupon.trim() : undefined, idempotency_key: idem })
      if (r.pix) { setPix(r.pix); setMsg(null); return }
      onDone(r.result === 'pendente' ? r.message : `Assinatura do ${plan.name} ativa. Obrigado!`)
    } catch (e2) { setMsg(e2.message); setIdem(newKey()) } finally { setBusy(false) }
  }
  useEffect(() => {
    if (!pix?.charge_id) return
    let active = true
    const checkPaid = async () => {
      try {
        const data = await api('/api/billing/me')
        const sub = data.subscriptions?.[plan.audience]
        if (!active || paidHandled.current || !sub || sub.plan_id !== plan.id || sub.status !== 'ativa' || sub.pending_pix) return
        paidHandled.current = true
        onDone(`Pagamento confirmado. O plano ${plan.name} está liberado.`)
      } catch { /* conexão indisponível: a próxima consulta repete sem cancelar o Pix */ }
    }
    const timer = setInterval(checkPaid, 5000)
    checkPaid()
    return () => { active = false; clearInterval(timer) }
  }, [pix?.charge_id, plan.audience, plan.id, plan.name])
  const confirmPixPaid = () => {
    if (paidHandled.current) return
    paidHandled.current = true
    onDone(`Pagamento confirmado. O plano ${plan.name} está liberado.`)
  }
  const tc = cfg.test_cards
  if (pix) return <div className="bl-modal-bg" onClick={onClose}><div className="bl-modal" role="dialog" aria-modal="true" aria-label={'Pagar ' + plan.name + ' com Pix'} onClick={e => e.stopPropagation()} data-testid="checkout-pix">
    <div className="bl-row"><h2>Pix gerado</h2><span className="bl-sp" /><button type="button" className="bl-x" aria-label="Fechar" onClick={onClose}>×</button></div>
    <PixBox pix={pix} testMode={cfg.test} onPaid={confirmPixPaid} onRegenerated={setPix} />
  </div></div>
  return <div className="bl-modal-bg" onClick={onClose}><form className="bl-modal" role="dialog" aria-modal="true" aria-label={'Assinar ' + plan.name} onClick={e => e.stopPropagation()} onSubmit={pay} data-testid="checkout">
    <div className="bl-row"><h2>Assinar {plan.name}</h2><span className="bl-sp" /><button type="button" className="bl-x" aria-label="Fechar" onClick={onClose}>×</button></div>
    <p className="bl-sum"><b>{brl(price)}</b> hoje e a cada mês{cv?.valid && cv.benefit === 'desconto' && <> · {cv.discount_pct}% de desconto por {cv.discount_cycles || 1} {(cv.discount_cycles || 1) > 1 ? 'meses' : 'mês'}</>}</p>
    <fieldset className="bl-paytypes"><legend>Forma de pagamento</legend><label><input type="radio" name="payment-type" value="card" checked={paymentType === 'card'} onChange={() => setPaymentType('card')} /> Cartão de crédito</label><label><input type="radio" name="payment-type" value="pix" checked={paymentType === 'pix'} onChange={() => setPaymentType('pix')} /> Pix</label></fieldset>
    {paymentType === 'pix' && <p className="bl-info">O plano será liberado após a confirmação do Pix. Na renovação, um novo Pix será gerado cinco dias antes do vencimento.</p>}
    {paymentType === 'pix' && cfg.requires_holder_info && <label className="bl-f">CPF ou CNPJ do pagador
      <input className="g-in" inputMode="numeric" autoComplete="off" required value={f.customer_document} onChange={set('customer_document')} data-testid="pix-customer-document" />
      <small>Necessário para registrar o pagador no Asaas.</small></label>}
    {paymentType === 'card' && tc && <details className="bl-test" open data-testid="test-cards"><summary>Ambiente de teste — use um cartão de teste</summary>
      <p>Aprovado: <code>{tc.aprova?.[0]}</code>{tc.recusa?.[0] && <> · Recusado: <code>{tc.recusa[0]}</code></>}{tc.recusa_renovacao?.[0] && <> · Recusa na renovação: <code>{tc.recusa_renovacao[0]}</code></>}. Validade futura e qualquer CVV.</p></details>}
    {paymentType === 'card' && cards.length > 0 && <label className="bl-f">Cartão<select className="g-in" value={useCard} onChange={e => setUseCard(e.target.value)} data-testid="card-select">
      {cards.map(c => <option key={c.id} value={c.id}>{(c.brand || 'Cartão') + ' final ' + c.last4}</option>)}<option value="novo">Novo cartão</option></select></label>}
    {paymentType === 'card' && useCard === 'novo' && <div className="bl-grid">
      <label className="bl-f bl-full">Número do cartão<input className="g-in" inputMode="numeric" autoComplete="cc-number" required value={f.number} onChange={set('number')} data-testid="cc-number" /></label>
      <label className="bl-f bl-full">Nome impresso<input className="g-in" autoComplete="cc-name" required value={f.holder_name} onChange={set('holder_name')} data-testid="cc-name" /></label>
      <label className="bl-f">Validade (MM/AA)<input className="g-in" inputMode="numeric" autoComplete="cc-exp" placeholder="12/30" required value={f.exp} onChange={set('exp')} data-testid="cc-exp" /></label>
      <label className="bl-f">CVV<input className="g-in" inputMode="numeric" autoComplete="cc-csc" required value={f.cvv} onChange={set('cvv')} data-testid="cc-cvv" /></label>
      {cfg.requires_holder_info && <>
        <label className="bl-f">CPF do titular<input className="g-in" inputMode="numeric" required value={f.cpf} onChange={set('cpf')} /></label>
        <label className="bl-f">Telefone<input className="g-in" inputMode="tel" autoComplete="tel" required value={f.phone} onChange={set('phone')} /></label>
        <label className="bl-f">CEP<input className="g-in" inputMode="numeric" autoComplete="postal-code" required value={f.postal_code} onChange={set('postal_code')} /></label>
        <label className="bl-f">Número do endereço<input className="g-in" required value={f.address_number} onChange={set('address_number')} /></label></>}
    </div>}
    <div className="bl-row bl-coupon"><input className="g-in" placeholder="Cupom de desconto (opcional)" value={coupon} onChange={e => { setCoupon(e.target.value); setCv(null) }} data-testid="coupon" /><button type="button" className="g-btn" onClick={checkCoupon}>Aplicar</button></div>
    {cv && <p className={cv.valid && cv.benefit === 'desconto' ? 'bl-ok' : 'bl-err'} data-testid="coupon-msg">{cv.valid ? cv.benefit === 'desconto' ? `Cupom aplicado: ${cv.discount_pct}% off.` : 'Este cupom é de período experimental; ative-o na tela inicial.' : cv.error}</p>}
    {msg && <p className="bl-err" role="alert" data-testid="checkout-error">{msg}</p>}
    <button className="bl-btn bl-wide" disabled={busy} data-testid="checkout-pay">{busy ? 'Processando…' : paymentType === 'pix' ? 'Gerar Pix de ' + brl(price) : 'Pagar ' + brl(price)}</button>
    <p className="bl-fine">Pagamento processado por {cfg.label}. Não guardamos o número nem o CVV do cartão. Ao assinar você aceita os <a href="#/legal/assinatura" target="_blank" rel="noopener">Termos de assinatura</a>.</p>
  </form></div>
}

function PixBox({ pix, testMode, onPaid, onRegenerated }) {
  const [busy, setBusy] = useState(false), [note, setNote] = useState('')
  const copy = async () => { try { await navigator.clipboard.writeText(pix.payload); setNote('Código Pix copiado.') } catch { setNote('Selecione e copie o código abaixo.') } }
  const regenerate = async () => { setBusy(true); try { const r = await post('/api/billing/pix/regenerate', { charge_id: pix.charge_id }); onRegenerated?.(r.pix); setNote('Novo Pix gerado.') } catch (e) { setNote(e.message) } finally { setBusy(false) } }
  const confirm = async () => { setBusy(true); try { await post('/api/billing/pix/confirm-test', { charge_id: pix.charge_id }); onPaid?.() } catch (e) { setNote(e.message) } finally { setBusy(false) } }
  return <div className="bl-pix" data-testid="pix-payment">
    {pix.qr_image && <img src={pix.qr_image} alt="QR Code Pix para pagamento" width="220" height="220" />}
    <p><b>{brl(pix.amount_cents)}</b> · válido até {new Date(pix.expires_at).toLocaleString('pt-BR')}</p>
    <label className="bl-f">Pix copia e cola<textarea className="g-in" readOnly value={pix.payload || ''} rows="4" /></label>
    <div className="bl-actions"><button type="button" className="bl-btn" onClick={copy}>Copiar código Pix</button>
      {pix.expired && <button type="button" className="g-btn" disabled={busy} onClick={regenerate}>Gerar novo Pix</button>}
      {testMode && <button type="button" className="g-btn" disabled={busy} onClick={confirm}>Confirmar Pix de teste</button>}</div>
    {note && <p className="bl-info" role="status">{note}</p>}
    <p className="bl-fine">O acesso só é liberado depois da confirmação do pagamento.</p>
  </div>
}

function NewCard({ cfg, onSaved, onCancel }) {
  const [f, setF] = useState({ number: '', holder_name: '', exp: '', cvv: '', cpf: '', postal_code: '', address_number: '', phone: '' }), [err, setErr] = useState(null), [busy, setBusy] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  async function save(e) { e.preventDefault(); setBusy(true); setErr(null)
    try { const [mm, yy] = f.exp.split('/'); const r = await post('/api/billing/cards', { number: f.number, holder_name: f.holder_name, exp_month: mm, exp_year: yy, cvv: f.cvv, holder: cfg.requires_holder_info ? { cpf: f.cpf, postal_code: f.postal_code, address_number: f.address_number, phone: f.phone } : undefined }); onSaved(r.card) }
    catch (e2) { setErr(e2.message) } finally { setBusy(false) } }
  return <form className="bl-grid bl-newcard" onSubmit={save} data-testid="new-card">
    <label className="bl-f bl-full">Número do cartão<input className="g-in" inputMode="numeric" required value={f.number} onChange={set('number')} data-testid="nc-number" /></label>
    <label className="bl-f bl-full">Nome impresso<input className="g-in" required value={f.holder_name} onChange={set('holder_name')} data-testid="nc-name" /></label>
    <label className="bl-f">Validade (MM/AA)<input className="g-in" required placeholder="12/30" value={f.exp} onChange={set('exp')} data-testid="nc-exp" /></label>
    <label className="bl-f">CVV<input className="g-in" required value={f.cvv} onChange={set('cvv')} data-testid="nc-cvv" /></label>
    {cfg.requires_holder_info && <><label className="bl-f">CPF<input className="g-in" required value={f.cpf} onChange={set('cpf')} /></label><label className="bl-f">Telefone<input className="g-in" required value={f.phone} onChange={set('phone')} /></label>
      <label className="bl-f">CEP<input className="g-in" required value={f.postal_code} onChange={set('postal_code')} /></label><label className="bl-f">Número<input className="g-in" required value={f.address_number} onChange={set('address_number')} /></label></>}
    {err && <p className="bl-err bl-full" role="alert">{err}</p>}
    <div className="bl-row bl-full"><button className="g-btn" disabled={busy} data-testid="nc-save">Salvar cartão</button><button type="button" className="g-btn" onClick={onCancel}>Cancelar</button></div>
  </form>
}

const ST_CLS = { ativa: 'ok', trial: 'ok', inadimplente: 'warn', carencia: 'warn', suspensa: 'bad', cancelada: 'bad' }
// ===== no app: planos + minha assinatura =====
export function Subscription() {
  const [me, setMe] = useState(null), [plans, setPlans] = useState(null), [cfg, setCfg] = useState(null), [err, setErr] = useState(null)
  const [buy, setBuy] = useState(null), [note, setNote] = useState(null), [busy, setBusy] = useState(false), [cardFor, setCardFor] = useState(null), [code, setCode] = useState('')
  const load = () => Promise.all([api('/api/billing/me'), api('/api/public/plans'), api('/api/billing/config')]).then(([m, p, c]) => { setMe(m); setPlans(p); setCfg(c) }).catch(e => setErr(e.message))
  useEffect(() => { load() }, [])
  useEffect(() => { if (!plans || !me) return; const want = new URLSearchParams(location.hash.split('?')[1] || '').get('plano'); const p = want && plans.plans.find(x => x.id === want && x.purchasable); if (p && me.subscriptions[p.audience]?.plan_id !== p.id) setBuy(p) }, [plans, me])
  async function act(path, body, ok) { setBusy(true); setNote(null); try { const r = await post(path, body); setNote({ ok: true, t: typeof ok === 'function' ? ok(r) : ok }); await load() } catch (e) { setNote({ ok: false, t: e.message }) } finally { setBusy(false) } }
  if (err) return <div className="ag bl-app"><p className="bl-err">{err}</p></div>
  if (!me || !plans || !cfg) return <div className="ag bl-app"><p className="bl-load">Carregando…</p></div>
  const current = Object.fromEntries(Object.entries(me.subscriptions).filter(([, s]) => s).map(([a, s]) => [a, s.plan_id]))
  return <div className="ag bl-app" data-testid="subscription">
    <span className="g-eyebrow">Conta</span><h1>Planos e pagamento</h1>
    {note && <p className={note.ok ? 'bl-ok' : 'bl-err'} role="status" data-testid="billing-note">{note.t}</p>}
    {me.access?.message && <p className="bl-info" data-testid="access-msg">{me.access.message}</p>}
    <TrialCard onChange={load} />
    {me.subscriptions.profissional !== undefined && <p><a href="#/pro/assinatura" className="adm-btn ghost" data-testid="link-pro-subscription">Minha assinatura PRO: alunos e vagas</a></p>}
    {Object.entries(me.subscriptions).filter(([, s]) => s).map(([aud, s]) => <section key={aud} className="bl-sub" data-testid={'my-sub-' + aud}>
      <div className="bl-row"><div><span className="g-eyebrow">{AUD[aud]}</span><h3>{s.plan_name}</h3></div><span className="bl-sp" /><span className={'bl-st ' + (ST_CLS[s.status] || '')} data-testid={'sub-status-' + aud}>{s.status_label || s.status}</span></div>
      {!s.is_free && <dl className="bl-dl">
        {s.price_cents != null && <><dt>Valor</dt><dd>{brl(s.price_cents)}/mês{s.discount_pct ? ` (${+s.discount_pct}% off por mais ${s.discount_cycles_left} ciclo(s))` : ''}</dd></>}
        <dt>Pagamento</dt><dd>{s.payment_type === 'pix' ? 'Pix mensal' : 'Cartão de crédito'}</dd>
        {s.status === 'trial' && <><dt>Teste até</dt><dd>{dBR(s.trial_ends_at)}</dd></>}
        {s.current_period_end && <><dt>{s.cancel_at_period_end ? 'Acesso até' : 'Próxima cobrança'}</dt><dd>{dBR(s.current_period_end)}</dd></>}
        {s.next_retry_at && <><dt>Nova tentativa</dt><dd>{dBR(s.next_retry_at)}</dd></>}
        {s.grace_until && s.status === 'carencia' && <><dt>Carência até</dt><dd>{dBR(s.grace_until)}</dd></>}
        {s.card && <><dt>Cartão</dt><dd>{(s.card.brand || 'Cartão') + ' final ' + s.card.last4}</dd></>}
      </dl>}
      {s.pending_pix && <PixBox pix={s.pending_pix} testMode={cfg.test} onPaid={() => { load(); accessChanged() }} onRegenerated={() => load()} />}
      {['inadimplente', 'carencia'].includes(s.status) && <p className="bl-warn">{s.payment_type === 'pix' ? 'O Pix da mensalidade ainda não foi confirmado. Pague ou gere um novo código para não perder o acesso.' : 'Não conseguimos cobrar seu cartão. Atualize o cartão ou pague agora para não perder o acesso.'}</p>}
      {s.status === 'suspensa' && <p className="bl-warn">Assinatura suspensa por falta de pagamento. Seus dados estão salvos: pague para reativar.</p>}
      {s.cancel_at_period_end && <p className="bl-info">Cancelamento agendado. Você pode desfazer até {dBR(s.current_period_end)}.</p>}
      {!s.is_free && s.provider && <div className="bl-actions">
        {['inadimplente', 'carencia', 'suspensa'].includes(s.status) && <button className="bl-btn" disabled={busy} onClick={() => act('/api/billing/pay-now', { audience: aud }, r => r.result === 'ativa' ? 'Pagamento aprovado. Assinatura em dia.' : 'Pagamento em análise.')} data-testid={'pay-now-' + aud}>Pagar agora</button>}
        {s.payment_type === 'card' && <button className="g-btn" onClick={() => setCardFor(cardFor === aud ? null : aud)} data-testid={'change-card-' + aud}>Trocar cartão</button>}
        {s.cancel_at_period_end ? <button className="g-btn" disabled={busy} onClick={() => act('/api/billing/reactivate', { audience: aud }, 'Cancelamento desfeito.')} data-testid={'reactivate-' + aud}>Desfazer cancelamento</button>
          : s.status !== 'cancelada' && <button className="g-btn bl-danger" disabled={busy} onClick={async () => { const reason = await askText('Quer nos contar o motivo? (opcional)', { ok: 'Cancelar assinatura', cancel: 'Voltar' }); if (reason === null || reason === undefined) return; act('/api/billing/cancel', { audience: aud, reason }, r => r.result === 'agendado' ? `Cancelamento agendado: acesso até ${dBR(r.until)}.` : 'Assinatura encerrada.') }} data-testid={'cancel-' + aud}>Cancelar assinatura</button>}
      </div>}
      {cardFor === aud && <div className="bl-cardpick">
        {me.cards.filter(c => c.id !== s.card?.id).map(c => <button key={c.id} className="g-btn" onClick={() => act('/api/billing/change-card', { audience: aud, card_id: c.id }, 'Cartão atualizado.').then(() => setCardFor(null))}>Usar {(c.brand || 'cartão') + ' final ' + c.last4}</button>)}
        <NewCard cfg={cfg} onCancel={() => setCardFor(null)} onSaved={c => act('/api/billing/change-card', { audience: aud, card_id: c.id }, 'Cartão atualizado.').then(() => setCardFor(null))} />
      </div>}
    </section>)}

    {me.access?.coupon_card && <section className="bl-sub" data-testid="trial-coupon"><h3>Tem um cupom de acesso experimental?</h3>
      <div className="bl-row bl-coupon"><input className="g-in" placeholder="Código do cupom" value={code} onChange={e => setCode(e.target.value)} /><button className="g-btn" disabled={busy || !code.trim()} onClick={() => act('/api/billing/coupon/redeem', { code: code.trim() }, 'Acesso experimental ativado.')}>Ativar</button></div></section>}

    <h2 className="bl-h2">Planos disponíveis</h2>
    <PlansCompare plans={plans.plans} current={current} testMode={plans.test_mode} initialAud={me.subscriptions.profissional !== undefined ? 'profissional' : 'aluno'} cta={p => current[p.audience] === p.id ? <span className="pl-btn pl-sec" data-testid={'current-' + p.id}>Seu plano atual</span>
      : !p.purchasable ? <span className="pl-btn" aria-disabled="true">Em breve</span>
      : <button className="pl-btn" onClick={() => setBuy(p)} data-testid={'buy-' + p.id}>{me.subscriptions[p.audience] && !me.subscriptions[p.audience].is_free ? 'Mudar para o ' + p.name : 'Assinar o ' + p.name}</button>} />
    <Faq />

    {me.charges.length > 0 && <section className="bl-sub" data-testid="charges"><h3>Histórico de cobranças</h3><ul className="rf-people" data-testid="charges-list">{me.charges.map(c => <li key={c.id}><span><b>{brl(c.amount_cents)}</b> · {c.description || c.kind}<br /><small className="bl-fine">{dBR(c.created_at)}{c.failure_message ? ' · ' + c.failure_message : ''}</small></span><span className={'rf-st' + (c.status === 'paga' ? ' assinante' : '')}>{{ paga: 'Paga', recusada: 'Recusada', pendente: 'Pendente', estornada: 'Estornada' }[c.status] || c.status}</span></li>)}</ul></section>}

    {me.cards.length > 0 && <section className="bl-sub" data-testid="cards"><h3>Cartões salvos</h3>{me.cards.map(c => <div key={c.id} className="bl-row bl-cardrow"><span>{(c.brand || 'Cartão') + ' final ' + c.last4} · {String(c.exp_month).padStart(2, '0')}/{c.exp_year}</span><span className="bl-sp" />
      <button className="g-btn" disabled={busy} onClick={async () => (await ask('Remover este cartão?', { ok: 'Remover', cancel: 'Voltar', danger: true })) && act('/api/billing/cards/remove', { id: c.id }, 'Cartão removido.')}>Remover</button></div>)}</section>}
    <p className="bl-fine"><a href="#/precos">Ver página pública de planos</a> · <a href="#/legal/assinatura">Termos de assinatura</a></p>
    <ReferralPanel />
    {buy && <Checkout plan={buy} cfg={cfg} cards={me.cards} onClose={() => setBuy(null)} onDone={t => { setBuy(null); setNote({ ok: true, t }); load(); accessChanged() }} />}
  </div>
}
