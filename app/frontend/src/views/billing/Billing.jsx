// V5 cobranca: pagina de planos (publica e no app), checkout com cartao, gestao da assinatura.
// Todo estado e regra ficam no servidor (/api/billing, /api/public/plans); aqui so exibimos e enviamos.
import { useState, useEffect } from 'react'
import { api } from '../../lib/api.js'
import Icon from '../../components/Icon.jsx'
import { useStore } from '../../store/useStore.js'
import './billing.css'

export const FEAT = {
  catalogo_completo: 'Programas oficiais completos', receber_ficha_profissional: 'Treinos do seu personal',
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

function PriceTag({ p }) {
  if (p.is_free) return <div className="bl-price"><b>Grátis</b></div>
  if (p.price_cents == null) return <div className="bl-price"><b className="bl-tbd">Preço a definir</b></div>
  return <div className="bl-price"><b>{brl(p.price_cents)}</b><span>/mês</span></div>
}

// cards + tabela comparativa; cta(plan) devolve o botao de cada plano
export function PlansCompare({ plans, cta, current = {}, testMode }) {
  const list = plans, aud = list.some(p => p.audience === 'profissional') ? 'profissional' : 'aluno'
  const feats = [...new Set(list.flatMap(p => Object.keys(p.features || {})))].filter(k => FEAT[k])
  const best = 'pro'
  return <div className="bl-wrap" data-testid="plans-compare">
    {testMode && <p className="bl-test" data-testid="billing-test-banner"><Icon name="info" /> Ambiente de teste: nenhum valor real é cobrado.</p>}
    {false && <div className="bl-seg" role="tablist">{auds.map(a => <button key={a} role="tab" aria-selected={aud === a} className={aud === a ? 'on' : ''} onClick={() => setAud(a)} data-testid={'aud-' + a}>{a}</button>)}</div>}
    <div className="bl-cards">
      {list.map(p => <article key={p.id} className={'bl-card' + (p.id === best ? ' bl-best' : '') + (current[p.audience] === p.id ? ' bl-cur' : '')} data-testid={'plan-card-' + p.id}>
        {p.id === best && <span className="bl-ribbon">Mais escolhido</span>}
        <span className="bl-for">{p.is_free ? 'Para começar' : FOR[p.audience]}</span><h3>{p.name}</h3><p className="bl-desc">{p.description}</p>
        <PriceTag p={p} />
        {!p.is_free && p.trial_days > 0 && <p className="bl-trial">{p.trial_days} dias grátis para testar</p>}
        <ul className="bl-feats">
          {p.limits?.alunos_ativos != null && <li><Icon name="check" /> Até <b>{p.limits.alunos_ativos}</b> alunos ativos</li>}
          {Object.entries(p.features || {}).filter(([k, v]) => v && FEAT[k]).map(([k]) => <li key={k}><Icon name="check" /> {FEAT[k]}</li>)}
          {(p.benefits || []).map((b, i) => <li key={i} className={b.state === 'disponivel' ? '' : 'bl-soon'}><Icon name={b.state === 'disponivel' ? 'check' : 'sparkles'} /> {b.label}{b.state !== 'disponivel' && <em> em breve</em>}</li>)}
        </ul>
        <div className="bl-cta">{cta(p)}</div>
      </article>)}
    </div>
    {list.length > 1 && feats.length > 0 && <div className="bl-tbl-wrap"><table className="bl-tbl" data-testid="plans-table"><caption>Compare os planos</caption>
      <thead><tr><th scope="col">Recurso</th>{list.map(p => <th key={p.id} scope="col">{p.name}</th>)}</tr></thead>
      <tbody>
        <tr><th scope="row">Preço</th>{list.map(p => <td key={p.id}>{p.is_free ? 'Grátis' : p.price_cents == null ? 'A definir' : brl(p.price_cents) + '/mês'}</td>)}</tr>
        {aud === 'profissional' && <tr><th scope="row">Alunos ativos</th>{list.map(p => <td key={p.id}>{p.limits?.alunos_ativos ?? '—'}</td>)}</tr>}
        {feats.map(k => <tr key={k}><th scope="row">{FEAT[k]}</th>{list.map(p => <td key={p.id}>{p.features?.[k] ? <span className="bl-yes" aria-label="incluído">✓</span> : <span className="bl-no" aria-label="não incluído">—</span>}</td>)}</tr>)}
        <tr><th scope="row">Teste grátis</th>{list.map(p => <td key={p.id}>{!p.is_free && p.trial_days ? p.trial_days + ' dias' : '—'}</td>)}</tr>
      </tbody></table></div>}
    <p className="bl-fine">Cobrança mensal no cartão de crédito, renovação automática. Cancele quando quiser: o acesso continua até o fim do período pago e seus dados ficam salvos.</p>
  </div>
}

// ===== pagina publica (sem login) =====
export function PublicPlans() {
  const [d, setD] = useState(null), [err, setErr] = useState(null)
  useEffect(() => { api('/api/public/plans').then(setD).catch(e => setErr(e.message)) }, [])
  const authed = !!useStore(s => s.user)
  return <div className="bl-page" data-testid="public-plans">
    <header className="bl-hero"><a href="#/" className="bl-logo">AVA<b>GYM</b></a>
      <h1>Treine com método. Escolha seu plano.</h1>
      <p>Comece grátis. Teste os planos pagos sem compromisso e cancele quando quiser.</p></header>
    {err ? <p className="bl-err">{err}</p> : !d ? <p className="bl-load">Carregando planos…</p> :
      <PlansCompare plans={catalog(d.plans)} testMode={d.test_mode} cta={p => <a className="bl-btn" data-testid={'cta-' + p.id} href={authed ? '#/assinatura?plano=' + p.id : '#/?cadastro=1&plano=' + p.id}>
        {p.is_free ? 'Criar conta grátis' : p.trial_days ? `Começar ${p.trial_days} dias grátis` : authed ? 'Assinar' : 'Criar conta e assinar'}</a>} />}
    <footer className="bl-foot"><a href="#/legal/termos">Termos de Uso</a> · <a href="#/legal/privacidade">Privacidade</a> · <a href="#/legal/assinatura">Termos de assinatura</a></footer>
  </div>
}

// ===== checkout =====
function Checkout({ plan, cfg, cards, onClose, onDone }) {
  const [useCard, setUseCard] = useState(cards[0]?.id || 'novo')
  const [f, setF] = useState({ number: '', holder_name: '', exp: '', cvv: '', cpf: '', postal_code: '', address_number: '', phone: '' })
  const [coupon, setCoupon] = useState(''), [cv, setCv] = useState(null)
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState(null)
  const newKey = () => crypto.randomUUID?.() || String(Date.now() + Math.random())
  const [idem, setIdem] = useState(newKey)   // BUG-031: uma chave por tentativa (duplo clique nao cobra 2x; nova tentativa usa chave nova)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const price = cv?.valid && cv.benefit === 'desconto' ? Math.round(plan.price_cents * (1 - cv.discount_pct / 100)) : plan.price_cents
  async function checkCoupon() { if (!coupon.trim()) return; try { setCv(await post('/api/billing/coupon/validate', { code: coupon.trim() })) } catch (e) { setCv({ valid: false, error: e.message }) } }
  async function pay(e) {
    e.preventDefault(); setBusy(true); setMsg(null)
    try {
      let card_id = useCard
      if (useCard === 'novo') {
        const [mm, yy] = f.exp.split('/').map(s => s.trim())
        const r = await post('/api/billing/cards', { number: f.number, holder_name: f.holder_name, exp_month: mm, exp_year: yy, cvv: f.cvv,
          holder: cfg.requires_holder_info ? { cpf: f.cpf, postal_code: f.postal_code, address_number: f.address_number, phone: f.phone } : undefined })
        card_id = r.card.id
      }
      const r = await post('/api/billing/subscribe', { plan_id: plan.id, card_id, coupon: cv?.valid && cv.benefit === 'desconto' ? coupon.trim() : undefined, idempotency_key: idem })
      onDone(r.result === 'trial' ? `Pronto! Seu teste do ${plan.name} vai até ${dBR(r.trial_ends_at)}. A primeira cobrança só acontece depois.` : r.result === 'pendente' ? r.message : `Assinatura do ${plan.name} ativa. Obrigado!`)
    } catch (e2) { setMsg(e2.message); setIdem(newKey()) } finally { setBusy(false) }
  }
  const tc = cfg.test_cards
  return <div className="bl-modal-bg" onClick={onClose}><form className="bl-modal" role="dialog" aria-modal="true" aria-label={'Assinar ' + plan.name} onClick={e => e.stopPropagation()} onSubmit={pay} data-testid="checkout">
    <div className="bl-row"><h2>Assinar {plan.name}</h2><span className="bl-sp" /><button type="button" className="bl-x" aria-label="Fechar" onClick={onClose}>×</button></div>
    <p className="bl-sum">{plan.trial_days > 0 ? <>{plan.trial_days} dias grátis, depois <b>{brl(price)}/mês</b></> : <><b>{brl(price)}</b> hoje e a cada mês</>}{cv?.valid && cv.benefit === 'desconto' && <> · {cv.discount_pct}% de desconto por {cv.discount_cycles || 1} {(cv.discount_cycles || 1) > 1 ? 'meses' : 'mês'}</>}</p>
    {tc && <details className="bl-test" open data-testid="test-cards"><summary>Ambiente de teste — use um cartão de teste</summary>
      <p>Aprovado: <code>{tc.aprova?.[0]}</code>{tc.recusa?.[0] && <> · Recusado: <code>{tc.recusa[0]}</code></>}{tc.recusa_renovacao?.[0] && <> · Recusa na renovação: <code>{tc.recusa_renovacao[0]}</code></>}. Validade futura e qualquer CVV.</p></details>}
    {cards.length > 0 && <label className="bl-f">Cartão<select className="g-in" value={useCard} onChange={e => setUseCard(e.target.value)} data-testid="card-select">
      {cards.map(c => <option key={c.id} value={c.id}>{(c.brand || 'Cartão') + ' final ' + c.last4}</option>)}<option value="novo">Novo cartão</option></select></label>}
    {useCard === 'novo' && <div className="bl-grid">
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
    <button className="bl-btn bl-wide" disabled={busy} data-testid="checkout-pay">{busy ? 'Processando…' : plan.trial_days > 0 ? 'Começar teste grátis' : 'Pagar ' + brl(price)}</button>
    <p className="bl-fine">Pagamento processado por {cfg.label}. Não guardamos o número do cartão. Ao assinar você aceita os <a href="#/legal/assinatura" target="_blank" rel="noopener">Termos de assinatura</a>.</p>
  </form></div>
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
  const mine = catalog(plans.plans, Object.keys(me.subscriptions))
  return <div className="ag bl-app" data-testid="subscription">
    <span className="g-eyebrow">Conta</span><h1>Planos e pagamento</h1>
    {note && <p className={note.ok ? 'bl-ok' : 'bl-err'} role="status" data-testid="billing-note">{note.t}</p>}
    {me.access?.message && <p className="bl-info" data-testid="access-msg">{me.access.message}</p>}
    {Object.entries(me.subscriptions).filter(([, s]) => s).map(([aud, s]) => <section key={aud} className="bl-sub" data-testid={'my-sub-' + aud}>
      <div className="bl-row"><div><span className="g-eyebrow">{AUD[aud]}</span><h3>{s.plan_name}</h3></div><span className="bl-sp" /><span className={'bl-st ' + (ST_CLS[s.status] || '')} data-testid={'sub-status-' + aud}>{s.status_label || s.status}</span></div>
      {!s.is_free && <dl className="bl-dl">
        {s.price_cents != null && <><dt>Valor</dt><dd>{brl(s.price_cents)}/mês{s.discount_pct ? ` (${+s.discount_pct}% off por mais ${s.discount_cycles_left} ciclo(s))` : ''}</dd></>}
        {s.status === 'trial' && <><dt>Teste até</dt><dd>{dBR(s.trial_ends_at)}</dd></>}
        {s.current_period_end && <><dt>{s.cancel_at_period_end ? 'Acesso até' : 'Próxima cobrança'}</dt><dd>{dBR(s.current_period_end)}</dd></>}
        {s.next_retry_at && <><dt>Nova tentativa</dt><dd>{dBR(s.next_retry_at)}</dd></>}
        {s.grace_until && s.status === 'carencia' && <><dt>Carência até</dt><dd>{dBR(s.grace_until)}</dd></>}
        {s.card && <><dt>Cartão</dt><dd>{(s.card.brand || 'Cartão') + ' final ' + s.card.last4}</dd></>}
      </dl>}
      {['inadimplente', 'carencia'].includes(s.status) && <p className="bl-warn">Não conseguimos cobrar seu cartão. Atualize o cartão ou pague agora para não perder o acesso.</p>}
      {s.status === 'suspensa' && <p className="bl-warn">Assinatura suspensa por falta de pagamento. Seus dados estão salvos: pague para reativar.</p>}
      {s.cancel_at_period_end && <p className="bl-info">Cancelamento agendado. Você pode desfazer até {dBR(s.current_period_end)}.</p>}
      {!s.is_free && s.provider && <div className="bl-actions">
        {['inadimplente', 'carencia', 'suspensa'].includes(s.status) && <button className="bl-btn" disabled={busy} onClick={() => act('/api/billing/pay-now', { audience: aud }, r => r.result === 'ativa' ? 'Pagamento aprovado. Assinatura em dia.' : 'Pagamento em análise.')} data-testid={'pay-now-' + aud}>Pagar agora</button>}
        <button className="g-btn" onClick={() => setCardFor(cardFor === aud ? null : aud)} data-testid={'change-card-' + aud}>Trocar cartão</button>
        {s.cancel_at_period_end ? <button className="g-btn" disabled={busy} onClick={() => act('/api/billing/reactivate', { audience: aud }, 'Cancelamento desfeito.')} data-testid={'reactivate-' + aud}>Desfazer cancelamento</button>
          : s.status !== 'cancelada' && <button className="g-btn bl-danger" disabled={busy} onClick={() => { const reason = prompt('Quer nos contar o motivo? (opcional)'); if (reason === null) return; act('/api/billing/cancel', { audience: aud, reason }, r => r.result === 'agendado' ? `Cancelamento agendado: acesso até ${dBR(r.until)}.` : 'Assinatura encerrada.') }} data-testid={'cancel-' + aud}>Cancelar assinatura</button>}
      </div>}
      {cardFor === aud && <div className="bl-cardpick">
        {me.cards.filter(c => c.id !== s.card?.id).map(c => <button key={c.id} className="g-btn" onClick={() => act('/api/billing/change-card', { audience: aud, card_id: c.id }, 'Cartão atualizado.').then(() => setCardFor(null))}>Usar {(c.brand || 'cartão') + ' final ' + c.last4}</button>)}
        <NewCard cfg={cfg} onCancel={() => setCardFor(null)} onSaved={c => act('/api/billing/change-card', { audience: aud, card_id: c.id }, 'Cartão atualizado.').then(() => setCardFor(null))} />
      </div>}
    </section>)}

    {me.access?.coupon_card && <section className="bl-sub" data-testid="trial-coupon"><h3>Tem um cupom de acesso experimental?</h3>
      <div className="bl-row bl-coupon"><input className="g-in" placeholder="Código do cupom" value={code} onChange={e => setCode(e.target.value)} /><button className="g-btn" disabled={busy || !code.trim()} onClick={() => act('/api/billing/coupon/redeem', { code: code.trim() }, 'Acesso experimental ativado.')}>Ativar</button></div></section>}

    <h2 className="bl-h2">Planos disponíveis</h2>
    <PlansCompare plans={mine} current={current} testMode={plans.test_mode} cta={p => current[p.audience] === p.id ? <span className="bl-btn bl-ghost" data-testid={'current-' + p.id}>Seu plano atual</span>
      : p.is_free ? <span className="bl-mut">Plano gratuito</span>
      : !p.purchasable ? <span className="bl-btn bl-ghost" aria-disabled="true">Em breve</span>
      : <button className="bl-btn" onClick={() => setBuy(p)} data-testid={'buy-' + p.id}>{me.subscriptions[p.audience] && !me.subscriptions[p.audience].is_free ? 'Mudar para este' : p.trial_days ? `Testar ${p.trial_days} dias grátis` : 'Assinar'}</button>} />

    {me.charges.length > 0 && <section className="bl-sub" data-testid="charges"><h3>Histórico de cobranças</h3><div className="bl-tbl-wrap"><table className="bl-tbl"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Situação</th></tr></thead>
      <tbody>{me.charges.map(c => <tr key={c.id}><td>{dBR(c.created_at)}</td><td>{c.description || c.kind}</td><td>{brl(c.amount_cents)}</td><td>{{ paga: 'Paga', recusada: 'Recusada', pendente: 'Pendente', estornada: 'Estornada' }[c.status] || c.status}{c.failure_message ? ' — ' + c.failure_message : ''}</td></tr>)}</tbody></table></div></section>}

    {me.cards.length > 0 && <section className="bl-sub" data-testid="cards"><h3>Cartões salvos</h3>{me.cards.map(c => <div key={c.id} className="bl-row bl-cardrow"><span>{(c.brand || 'Cartão') + ' final ' + c.last4} · {String(c.exp_month).padStart(2, '0')}/{c.exp_year}</span><span className="bl-sp" />
      <button className="g-btn" disabled={busy} onClick={() => confirm('Remover este cartão?') && act('/api/billing/cards/remove', { id: c.id }, 'Cartão removido.')}>Remover</button></div>)}</section>}
    <p className="bl-fine"><a href="#/precos">Ver página pública de planos</a> · <a href="#/legal/assinatura">Termos de assinatura</a></p>
    {buy && <Checkout plan={buy} cfg={cfg} cards={me.cards} onClose={() => setBuy(null)} onDone={t => { setBuy(null); setNote({ ok: true, t }); load() }} />}
  </div>
}