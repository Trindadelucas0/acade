// V5 cobranca (admin): politica, planos/precos/recursos, cupons e campanhas, parceiros, assinaturas, cobrancas,
// webhooks, reconciliacao e simulador. Tudo auditado no servidor (audit_log).
import { useState, useEffect } from 'react'
import { api } from '../../lib/api.js'
import { FEAT, brl } from './Billing.jsx'

const post = (p, b) => api(p, { method: 'POST', body: JSON.stringify(b || {}) })
const dBR = d => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
function useGet(path) { const [d, setD] = useState(null), [e, setE] = useState(null); const load = () => api(path).then(setD).catch(x => setE(x.message)); useEffect(() => { load() }, [path]); return [d, e, load] }
function Msg({ m }) { return m ? <p className={m.ok ? 'bl-ok' : 'bl-err'} role="status" data-testid="adm-billing-msg">{m.t}</p> : null }

export default function AdmBilling() {
  const [sub, setSub] = useState('geral')
  const T = [['geral', 'Visão geral'], ['planos', 'Planos e preços'], ['cupons', 'Cupons e campanhas'], ['parceiros', 'Parceiros'], ['assinaturas', 'Assinaturas e cobranças']]
  return <div data-testid="adm-billing">
    <div className="mg-subtabs" role="tablist">{T.map(([k, l]) => <button key={k} role="tab" aria-selected={sub === k} className={'adm-btn ' + (sub === k ? '' : 'ghost')} onClick={() => setSub(k)} data-testid={'bill-tab-' + k}>{l}</button>)}</div>
    {sub === 'geral' && <Geral />}{sub === 'planos' && <Planos />}{sub === 'cupons' && <Cupons />}{sub === 'parceiros' && <Parceiros />}{sub === 'assinaturas' && <Assinaturas />}
  </div>
}

function Geral() {
  const [d, e, load] = useGet('/api/adm/billing/overview'), [f, setF] = useState(null), [m, setM] = useState(null)
  useEffect(() => { if (d) setF({ monetizacao_ativa: !!d.policy.monetizacao_ativa, carencia_dias: d.policy.cobranca_carencia_dias, retentativas_dias: (d.policy.cobranca_retentativas_dias || []).join(','), experimental_dias: d.policy.experimental_dias, parceiros_comissao_pct: d.policy.parceiros_comissao_pct, aviso_fim_teste_dias: d.policy.aviso_fim_teste_dias }) }, [d])
  if (e) return <p className="bl-err">{e}</p>; if (!d || !f) return <p>Carregando…</p>
  const pv = d.provider
  async function save() { try { await post('/api/adm/billing/settings', { ...f, retentativas_dias: String(f.retentativas_dias).split(',').map(s => +s.trim()).filter(Boolean) }); setM({ ok: true, t: 'Política salva.' }); load() } catch (x) { setM({ ok: false, t: x.message }) } }
  async function reconcile() { try { const r = await post('/api/adm/billing/reconcile'); setM({ ok: true, t: 'Reconciliação concluída: ' + JSON.stringify(r.reconcile) }); load() } catch (x) { setM({ ok: false, t: x.message }) } }
  async function replay(id) { try { const r = await post('/api/adm/billing/webhooks/replay', { id }); setM({ ok: true, t: 'Reprocessado: ' + JSON.stringify(r) }); load() } catch (x) { setM({ ok: false, t: x.message }) } }
  return <div className="ag">
    <Msg m={m} />
    <div className="adm-card" data-testid="billing-provider"><h3>Provedor de pagamento</h3>
      <p><b>{pv.label}</b> {pv.test ? <span className="g-chip">TESTE — nenhum valor real</span> : pv.live ? <span className="g-chip">PRODUÇÃO</span> : null}</p>
      {pv.fallback_reason && <p className="bl-warn">Usando o simulador: {pv.fallback_reason}</p>}
      {pv.warnings?.map((w, i) => <p key={i} className="bl-warn">{w}</p>)}
      <p className="g-xs g-mut">Webhook com token: {pv.webhook_token_set ? 'configurado' : 'não configurado'}. A troca de provedor é feita só por variáveis de ambiente no servidor (BILLING_PROVIDER, ASAAS_ENV, ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN).</p>
      <button className="adm-btn" onClick={reconcile} data-testid="billing-reconcile">Reconciliar agora</button></div>
    <div className="adm-card"><h3>Política de cobrança</h3>
      <label className="g-row"><input type="checkbox" checked={f.monetizacao_ativa} onChange={e => setF({ ...f, monetizacao_ativa: e.target.checked })} data-testid="pol-monet" /> Monetização ativa (exige plano para os recursos pagos)</label>
      <div className="adm-row2">
        <label className="adm-field">Carência (dias)<input className="adm-in" type="number" value={f.carencia_dias} onChange={e => setF({ ...f, carencia_dias: e.target.value })} /></label>
        <label className="adm-field">Retentativas (dias, separados por vírgula)<input className="adm-in" value={f.retentativas_dias} onChange={e => setF({ ...f, retentativas_dias: e.target.value })} /></label>
        <label className="adm-field">Teste experimental por cupom (dias)<input className="adm-in" type="number" value={f.experimental_dias} onChange={e => setF({ ...f, experimental_dias: e.target.value })} /></label>
        <label className="adm-field">Comissão padrão de parceiros (%)<input className="adm-in" type="number" value={f.parceiros_comissao_pct} onChange={e => setF({ ...f, parceiros_comissao_pct: e.target.value })} /></label>
        <label className="adm-field">Aviso de fim do teste (dias antes)<input className="adm-in" type="number" value={f.aviso_fim_teste_dias} onChange={e => setF({ ...f, aviso_fim_teste_dias: e.target.value })} /></label>
      </div><button className="adm-btn" onClick={save} data-testid="pol-save">Salvar política</button></div>
    <div className="adm-card"><h3>Resumo</h3>
      <p>Assinaturas: {d.subscriptions.map(s => `${s.product} ${s.status}: ${s.n}`).join(' · ') || 'nenhuma'}</p>
      <p>Cobranças (30 dias): {d.charges_30d.map(c => `${c.status}: ${c.n} (${brl(c.total)})`).join(' · ') || 'nenhuma'}</p>
      <p>Cupons ativos: {d.coupons?.ativos ?? 0} · resgates: {d.coupons?.resgates ?? 0} · conversões: {d.coupons?.conversoes ?? 0}</p></div>
    <div className="adm-card"><h3>Webhooks recentes</h3><div className="adm-tbl-wrap"><table className="adm-table"><thead><tr><th>Recebido</th><th>Provedor</th><th>Evento</th><th>Resultado</th><th></th></tr></thead>
      <tbody>{d.webhooks.map(w => <tr key={w.id}><td>{dBR(w.received_at)}</td><td>{w.provider}</td><td>{w.event_type}</td><td>{w.result}{w.error ? ' — ' + w.error : ''}</td><td><button className="adm-btn ghost" onClick={() => replay(w.id)}>Reprocessar</button></td></tr>)}</tbody></table></div></div>
  </div>
}

function PlanRow({ p, onSaved }) {
  const [f, setF] = useState({ name: p.name, description: p.description || '', price: p.price_cents == null ? '' : (p.price_cents / 100).toFixed(2), trial_days: p.trial_days ?? '', sellable: !!p.sellable, active: !!p.active, features: { ...(p.features || {}) }, alunos: p.limits?.alunos_ativos ?? '' })
  const [m, setM] = useState(null)
  const featKeys = p.audience === 'aluno' ? ['catalogo_completo'] : ['prescrever', 'convidar_alunos', 'construtor_treino', 'fichas_publicas']
  async function save() {
    try {
      const body = { id: p.id, name: f.name, description: f.description, trial_days: f.trial_days === '' ? null : +f.trial_days, sellable: f.sellable, active: f.active, features: f.features }
      if (!p.is_free) body.price_cents = f.price === '' ? null : Math.round(+String(f.price).replace(',', '.') * 100)
      if (p.audience === 'profissional') body.limits = { ...(p.limits || {}), alunos_ativos: +f.alunos }
      await post('/api/adm/billing/plans', body); setM({ ok: true, t: 'Plano salvo.' }); onSaved()
    } catch (x) { setM({ ok: false, t: x.message }) }
  }
  return <div className="adm-card" data-testid={'adm-plan-' + p.id}>
    <div className="g-row"><b>{p.id}</b><span className="g-chip">{p.audience}</span>{p.is_free && <span className="g-chip">gratuito</span>}<span className="g-sp" /><span className="g-xs g-mut">v{p.version} · {p.subscribers} assinante(s)</span></div>
    <div className="adm-row2">
      <label className="adm-field">Nome<input className="adm-in" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      {!p.is_free && <label className="adm-field">Preço mensal (R$)<input className="adm-in" inputMode="decimal" placeholder="a definir" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} data-testid={'price-' + p.id} /></label>}
      {!p.is_free && <label className="adm-field">Dias de teste do plano<input className="adm-in" type="number" value={f.trial_days} onChange={e => setF({ ...f, trial_days: e.target.value })} data-testid={'trial-' + p.id} /></label>}
      {p.audience === 'profissional' && <label className="adm-field">Alunos ativos (limite)<input className="adm-in" type="number" value={f.alunos} onChange={e => setF({ ...f, alunos: e.target.value })} /></label>}
    </div>
    <label className="adm-field">Descrição<input className="adm-in" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></label>
    <div className="g-row" style={{ flexWrap: 'wrap', gap: 12, margin: '8px 0' }}>
      {featKeys.map(k => <label key={k} className="g-row g-sm"><input type="checkbox" checked={!!f.features[k]} onChange={e => setF({ ...f, features: { ...f.features, [k]: e.target.checked } })} data-testid={'feat-' + p.id + '-' + k} /> {FEAT[k]}</label>)}
    </div>
    <div className="g-row" style={{ gap: 12 }}>
      {!p.is_free && <label className="g-row g-sm"><input type="checkbox" checked={f.sellable} onChange={e => setF({ ...f, sellable: e.target.checked })} data-testid={'sellable-' + p.id} /> À venda</label>}
      <label className="g-row g-sm"><input type="checkbox" checked={f.active} onChange={e => setF({ ...f, active: e.target.checked })} /> Ativo</label>
      <span className="g-sp" /><button className="adm-btn" onClick={save} data-testid={'save-' + p.id}>Salvar</button></div>
    <Msg m={m} />
  </div>
}
function Planos() {
  const [d, e, load] = useGet('/api/adm/billing/plans')
  if (e) return <p className="bl-err">{e}</p>; if (!d) return <p>Carregando…</p>
  return <div className="ag"><p className="adm-sub">Mudanças de recursos ou limites criam uma nova versão: quem já assina continua na versão contratada. Para vender, defina preço maior que zero e marque "À venda".</p>
    {d.plans.filter(p => ['aluno_free', 'profissional_free', 'individual', 'pro'].includes(p.id)).map(p => <PlanRow key={p.id + p.version + (p.updated_at || '')} p={p} onSaved={load} />)}</div>
}

function Cupons() {
  const [d, e, load] = useGet('/api/adm/billing/campaigns'), [pt] = useGet('/api/adm/billing/partners'), [m, setM] = useState(null)
  const [c, setC] = useState({ name: '', kind: 'oficial', benefit: 'desconto', discount_pct: 20, discount_cycles: 1, trial_days: '', partner_user_id: '', applies_to: '' })
  const [k, setK] = useState({ campaign_id: '', code: '', max_redemptions: '' })
  if (e) return <p className="bl-err">{e}</p>; if (!d) return <p>Carregando…</p>
  const run = async (fn, t) => { try { await fn(); setM({ ok: true, t }); load() } catch (x) { setM({ ok: false, t: x.message }) } }
  return <div className="ag"><Msg m={m} />
    <div className="adm-card"><h3>Nova campanha</h3><div className="adm-row2">
      <label className="adm-field">Nome<input className="adm-in" value={c.name} onChange={e => setC({ ...c, name: e.target.value })} data-testid="camp-name" /></label>
      <label className="adm-field">Tipo<select className="adm-in" value={c.kind} onChange={e => setC({ ...c, kind: e.target.value })}><option value="oficial">Oficial</option><option value="parceiro">Parceiro</option></select></label>
      <label className="adm-field">Benefício<select className="adm-in" value={c.benefit} onChange={e => setC({ ...c, benefit: e.target.value })} data-testid="camp-benefit"><option value="desconto">Desconto (%)</option><option value="trial">Acesso experimental</option></select></label>
      {c.benefit === 'desconto' ? <><label className="adm-field">Desconto (%)<input className="adm-in" type="number" value={c.discount_pct} onChange={e => setC({ ...c, discount_pct: e.target.value })} data-testid="camp-pct" /></label>
        <label className="adm-field">Por quantos meses<input className="adm-in" type="number" value={c.discount_cycles} onChange={e => setC({ ...c, discount_cycles: e.target.value })} /></label></>
        : <label className="adm-field">Dias de acesso (vazio = padrão)<input className="adm-in" type="number" value={c.trial_days} onChange={e => setC({ ...c, trial_days: e.target.value })} /></label>}
      {c.kind === 'parceiro' && <label className="adm-field">Parceiro<select className="adm-in" value={c.partner_user_id} onChange={e => setC({ ...c, partner_user_id: e.target.value })}><option value="">Escolha</option>{pt?.partners.map(p => <option key={p.user_id} value={p.user_id}>{p.name}</option>)}</select></label>}
      <label className="adm-field">Vale para os planos (ids, vírgula; vazio = todos)<input className="adm-in" value={c.applies_to} onChange={e => setC({ ...c, applies_to: e.target.value })} /></label>
    </div><button className="adm-btn" data-testid="camp-save" onClick={() => run(() => post('/api/adm/billing/campaigns', { ...c, applies_to: c.applies_to.split(',').map(s => s.trim()).filter(Boolean) }), 'Campanha criada.')}>Criar campanha</button></div>
    <div className="adm-card"><h3>Novo cupom</h3><div className="adm-row2">
      <label className="adm-field">Campanha<select className="adm-in" value={k.campaign_id} onChange={e => setK({ ...k, campaign_id: e.target.value })} data-testid="code-camp"><option value="">Escolha</option>{d.campaigns.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="adm-field">Código<input className="adm-in" value={k.code} onChange={e => setK({ ...k, code: e.target.value.toUpperCase() })} data-testid="code-code" /></label>
      <label className="adm-field">Limite de resgates (vazio = sem limite)<input className="adm-in" type="number" value={k.max_redemptions} onChange={e => setK({ ...k, max_redemptions: e.target.value })} /></label>
    </div><button className="adm-btn" data-testid="code-save" onClick={() => run(() => post('/api/adm/billing/codes', k), 'Cupom criado.')}>Criar cupom</button></div>
    <div className="adm-card"><h3>Campanhas</h3><div className="adm-tbl-wrap"><table className="adm-table"><thead><tr><th>Nome</th><th>Tipo</th><th>Benefício</th><th>Status</th><th>Resgates</th></tr></thead>
      <tbody>{d.campaigns.map(x => <tr key={x.id}><td>{x.name}</td><td>{x.kind}{x.partner_name ? ' · ' + x.partner_name : ''}</td><td>{x.benefit === 'desconto' ? `${+x.discount_pct}% × ${x.discount_cycles}` : `${x.trial_days || 'padrão'} dias`}</td><td>{x.status}</td><td>{x.resgates}</td></tr>)}</tbody></table></div></div>
    <div className="adm-card"><h3>Cupons</h3><div className="adm-tbl-wrap"><table className="adm-table"><thead><tr><th>Código</th><th>Campanha</th><th>Status</th><th>Resgates</th><th>Conversões</th><th></th></tr></thead>
      <tbody>{d.codes.map(x => <tr key={x.id}><td><code>{x.code}</code></td><td>{x.campaign_name}</td><td>{x.status}</td><td>{x.resgates}{x.max_redemptions ? ' / ' + x.max_redemptions : ''}</td><td>{x.conversoes}</td>
        <td>{x.status === 'ativo' ? <button className="adm-btn ghost" onClick={() => run(() => post('/api/adm/billing/codes/status', { id: x.id, status: 'pausado' }), 'Cupom pausado.')}>Pausar</button> : x.status === 'pausado' ? <button className="adm-btn ghost" onClick={() => run(() => post('/api/adm/billing/codes/status', { id: x.id, status: 'ativo' }), 'Cupom reativado.')}>Reativar</button> : null}</td></tr>)}</tbody></table></div></div>
  </div>
}

function Parceiros() {
  const [d, e, load] = useGet('/api/adm/billing/partners'), [f, setF] = useState({ user_id: '', commission_pct: '', status: 'ativo' }), [m, setM] = useState(null)
  if (e) return <p className="bl-err">{e}</p>; if (!d) return <p>Carregando…</p>
  const save = async b => { try { await post('/api/adm/billing/partners', b); setM({ ok: true, t: 'Parceiro salvo.' }); load() } catch (x) { setM({ ok: false, t: x.message }) } }
  return <div className="ag"><Msg m={m} />
    <div className="adm-card"><h3>Aprovar parceiro</h3><div className="adm-row2">
      <label className="adm-field">Profissional<select className="adm-in" value={f.user_id} onChange={e => setF({ ...f, user_id: e.target.value })}><option value="">Escolha</option>{d.candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}</select></label>
      <label className="adm-field">Comissão (%; vazio = padrão)<input className="adm-in" type="number" value={f.commission_pct} onChange={e => setF({ ...f, commission_pct: e.target.value })} /></label>
    </div><button className="adm-btn" onClick={() => save(f)}>Salvar</button></div>
    <div className="adm-card"><div className="adm-tbl-wrap"><table className="adm-table"><thead><tr><th>Parceiro</th><th>Status</th><th>Comissão</th><th>Campanhas</th><th>Comissão prevista</th><th></th></tr></thead>
      <tbody>{d.partners.map(p => <tr key={p.user_id}><td>{p.name}<br /><span className="g-xs g-mut">{p.email}</span></td><td>{p.status}</td><td>{p.commission_pct != null ? +p.commission_pct + '%' : 'padrão'}</td><td>{p.campanhas}</td><td>{brl(p.comissao_prevista)}</td>
        <td><button className="adm-btn ghost" onClick={() => save({ user_id: p.user_id, commission_pct: p.commission_pct, status: p.status === 'ativo' ? 'pausado' : 'ativo' })}>{p.status === 'ativo' ? 'Pausar' : 'Ativar'}</button></td></tr>)}</tbody></table></div></div>
  </div>
}

function Assinaturas() {
  const [d, e, load] = useGet('/api/adm/billing/subscriptions'), [sel, setSel] = useState(null), [ch, setCh] = useState(null), [m, setM] = useState(null)
  const [all] = useGet('/api/adm/billing/charges')
  const open = async s => { setSel(s); setCh(await api('/api/adm/billing/charges?subscription_id=' + s.id).catch(() => null)) }
  const sim = async (action, s) => { try { const r = await post('/api/adm/billing/simulate', { action, subscription_id: s.id }); setM({ ok: true, t: `Simulado: ${action} → ${r.subscription?.status}` }); load(); open({ ...s, ...r.subscription }) } catch (x) { setM({ ok: false, t: x.message }) } }
  if (e) return <p className="bl-err">{e}</p>; if (!d) return <p>Carregando…</p>
  return <div className="ag"><Msg m={m} />
    <div className="adm-card"><h3>Assinaturas pagas</h3><div className="adm-tbl-wrap"><table className="adm-table" data-testid="adm-subs"><thead><tr><th>Conta</th><th>Plano</th><th>Status</th><th>Valor</th><th>Período até</th><th>Cartão</th></tr></thead>
      <tbody>{d.subscriptions.map(s => <tr key={s.id} onClick={() => open(s)} style={{ cursor: 'pointer' }}><td>{s.name}<br /><span className="g-xs g-mut">{s.email}</span></td><td>{s.plan_name}</td><td>{s.status}{s.cancel_at_period_end ? ' (cancela no fim)' : ''}</td><td>{s.price_cents != null ? brl(s.price_cents) : '—'}</td><td>{dBR(s.current_period_end)}</td><td>{s.last4 ? '•••• ' + s.last4 : '—'}</td></tr>)}</tbody></table></div></div>
    {sel && <div className="adm-card" data-testid="adm-sub-detail"><h3>{sel.name} — {sel.plan_name} ({sel.status})</h3>
      <p className="g-xs g-mut">Simulador de tempo (só com o provedor simulado): antecipa o vencimento e roda o job de cobrança na hora.</p>
      <div className="g-row" style={{ flexWrap: 'wrap', gap: 8 }}>{[['vencer_periodo', 'Vencer período (renovar)'], ['vencer_retentativa', 'Vencer retentativa'], ['vencer_carencia', 'Vencer carência']].map(([a, l]) => <button key={a} className="adm-btn ghost" onClick={() => sim(a, sel)} data-testid={'sim-' + a}>{l}</button>)}</div>
      {ch && <><h4>Eventos</h4><ul className="g-sm">{ch.events.map((x, i) => <li key={i}>{dBR(x.created_at)} · {x.action} {x.from_status ? x.from_status + ' → ' + x.to_status : ''}</li>)}</ul></>}
    </div>}
    <div className="adm-card"><h3>Cobranças recentes</h3>{all && <div className="adm-tbl-wrap"><table className="adm-table"><thead><tr><th>Data</th><th>Conta</th><th>Tipo</th><th>Valor</th><th>Status</th><th>Tentativa</th></tr></thead>
      <tbody>{all.charges.map(c => <tr key={c.id}><td>{dBR(c.created_at)}</td><td>{c.email}</td><td>{c.kind}</td><td>{brl(c.amount_cents)}</td><td>{c.status}{c.failure_message ? ' — ' + c.failure_message : ''}</td><td>{c.attempt}</td></tr>)}</tbody></table></div>}</div>
  </div>
}