// V4.2 · contas: troca obrigatória da senha provisória, cadeado + "Solicitar liberação", tela de escopo do aluno do personal,
// cadastro de aluno pelo personal, histórico de fichas, liberações (admin) e exportação LGPD por e-mail.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { api } from '../../lib/api.js'
import { useStore } from '../../store/useStore.js'
import { Sheet, useLoad } from '../app/kit.jsx'
import { askText } from '../../lib/dialog.js'

const post = (p, b) => api(p, { method: 'POST', body: JSON.stringify(b || {}) })
const dt = s => s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
export const isLockedUser = u => !!u && !u.admin && !!u.access_locked
export const isScoped = u => !!u && !!u.client_locked

// ---------- 1º acesso do aluno criado pelo personal ----------
export function MustChangePassword() {
  const user = useStore(s => s.user), setUser = useStore(s => s.setUser)
  const [cur, setCur] = useState(''), [nw, setNw] = useState(''), [rep, setRep] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const ok = nw.length >= 8 && nw === rep && nw !== cur
  const save = async e => {
    e.preventDefault(); setMsg('')
    if (nw !== rep) return setMsg('As senhas não conferem.')
    setBusy(true)
    try { const r = await post('/api/auth/password', { current_password: cur, new_password: nw }); setUser({ ...user, ...(r.user || {}), must_change_password: false }); location.reload() }
    catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }
  return <form className="ag g-page" data-testid="must-change-gate" onSubmit={save} style={{ maxWidth: 460, margin: '0 auto' }}>
    <span className="g-ico" style={{ color: 'var(--ag-acc)' }}><Icon name="lock" /></span>
    <h1 className="g-h1">Crie sua senha</h1>
    <p className="g-mut">Sua conta foi criada pelo seu personal com uma senha provisória. Antes de começar, crie uma senha só sua.</p>
    <label className="g-field"><span className="g-mut g-xs">Senha provisória</span><input type="password" autoComplete="current-password" value={cur} onChange={e => setCur(e.target.value)} data-testid="mc-current" required /></label>
    <label className="g-field"><span className="g-mut g-xs">Nova senha (mínimo 8 caracteres)</span><input type="password" autoComplete="new-password" value={nw} onChange={e => setNw(e.target.value)} data-testid="mc-new" required minLength={8} /></label>
    <label className="g-field"><span className="g-mut g-xs">Repita a nova senha</span><input type="password" autoComplete="new-password" value={rep} onChange={e => setRep(e.target.value)} data-testid="mc-rep" required /></label>
    {msg && <p className="g-bad2" role="alert">{msg}</p>}
    <button className="g-btn g-block" disabled={!ok || busy} style={{ marginTop: 14 }} data-testid="mc-save">{busy ? 'Salvando…' : 'Salvar e entrar'}</button>
    <button type="button" className="g-btn g-ghost g-block" style={{ marginTop: 8 }} onClick={() => useStore.getState().signOut().then(() => location.reload())}>Sair</button>
  </form>
}

// ---------- pedido de liberação ----------
export function UnlockRequest({ compact }) {
  const [d, err, reload] = useLoad(() => api('/api/me/unlock-request'))
  const [reason, setReason] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  if (err) return <p className="g-warn g-sm">{err}</p>
  if (!d) return null
  if (!d.locked) return null
  const open = d.requests.find(r => r.status === 'pendente'), last = d.requests[0]
  const send = async () => { setBusy(true); setMsg(''); try { await post('/api/me/unlock-request', { reason }); reload() } catch (e) { setMsg(e.message) } finally { setBusy(false) } }
  return <div className="g-card v42-lock" data-testid="unlock-box">
    <div className="g-row" style={{ gap: 10, alignItems: 'center' }}><span className="g-ico"><Icon name="lock" /></span>
      <b>{d.scoped_client ? 'Acesso incluído no plano do seu personal' : 'Ações travadas até a liberação'}</b></div>
    {!compact && <p className="g-sm g-mut" style={{ marginTop: 6 }}>{d.scoped_client
      ? 'Você usa as fichas, a comunidade e os desafios do seu personal. Para o restante do app, peça a liberação.'
      : 'Você pode ver todas as telas. Ações como iniciar treino, publicar ou cadastrar ficam travadas até a liberação.'}</p>}
    {open ? <p className="g-sm" data-testid="unlock-pending" style={{ marginTop: 8 }}>Pedido enviado em {dt(open.created_at)}. Em análise.</p> : <>
      {last?.status === 'recusada' && <p className="g-xs g-warn">Último pedido recusado{last.decision_note ? `: ${last.decision_note}` : ''}.</p>}
      {!compact && <textarea className="g-in" rows={2} maxLength={500} placeholder="Conte o motivo (opcional)" value={reason} onChange={e => setReason(e.target.value)} style={{ width: '100%', marginTop: 8 }} />}
      {msg && <p className="g-bad2 g-sm">{msg}</p>}
      <button className="g-btn" style={{ marginTop: 8 }} disabled={busy} onClick={send} data-testid="unlock-request-btn"><Icon name="lock" /> Solicitar liberação</button></>}
  </div>
}
// faixa fixa no topo das telas para contas travadas
export function LockBanner() {
  const u = useStore(s => s.user)
  if (!isLockedUser(u)) return null
  return <div className="v42-banner" data-testid="lock-banner" role="status"><Icon name="lock" /><span>{isScoped(u) ? 'Conta do seu personal: algumas áreas estão travadas.' : 'Conta em liberação: você pode ver tudo, mas as ações estão travadas.'}</span>
    <a href="#/perfil?liberacao=1">Solicitar liberação</a></div>
}
// abre sozinho quando a API responde ACCESS_LOCKED / CLIENT_SCOPE (o bloqueio de verdade é no backend)
export function AccessLockHost() {
  const [e, setE] = useState(null)
  useEffect(() => { const h = ev => setE(ev.detail); addEventListener('avagym:access-locked', h); return () => removeEventListener('avagym:access-locked', h) }, [])
  if (!e) return null
  return <Sheet title="Ação travada" onClose={() => setE(null)}>
    <div data-testid="access-locked-sheet" data-code={e.code}>
      <p className="g-sm">{e.error}</p>
      <UnlockRequest compact />
      <button className="g-btn g-ghost" style={{ marginTop: 10 }} onClick={() => setE(null)}>Entendi</button></div>
  </Sheet>
}
// tela explicativa para áreas fora do plano do personal
export function ScopeGate({ title, children }) {
  const u = useStore(s => s.user), nav = useNavigate()
  if (!isScoped(u)) return children
  return <div className="ag g-page" data-testid="scope-gate">
    <span className="g-ico" style={{ color: 'var(--ag-acc)' }}><Icon name="lock" /></span>
    <h1 className="g-h1">{title || 'Área travada'}</h1>
    <p className="g-mut">Sua conta faz parte do plano do seu personal. Ela dá acesso às fichas, à comunidade e aos desafios dele. Esta área fica disponível depois da liberação.</p>
    <UnlockRequest />
    <button className="g-btn g-ghost g-block" style={{ marginTop: 10 }} onClick={() => nav('/treinos')}>Ver minhas fichas</button>
  </div>
}

// ---------- personal: cadastrar aluno ----------
export function ProClients() {
  const [d, err, reload] = useLoad(() => api('/api/pro/clients'))
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [cred, setCred] = useState(null)
  const create = async e => {
    e.preventDefault(); setBusy(true); setMsg('')
    try { const r = await post('/api/pro/clients', { name, email }); setCred({ email: r.email, pw: r.temp_password }); setName(''); setEmail(''); reload() }
    catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }
  const reset = async c => { try { const r = await post('/api/pro/clients/reset-password', { id: c.id }); setCred({ email: c.email, pw: r.temp_password }) } catch (e) { setMsg(e.message) } }
  return <section className="g-card" data-testid="pro-clients">
    <h3 className="g-h3">Cadastrar aluno</h3>
    <p className="g-xs g-mut">A conta entra no seu plano. O sistema gera uma senha provisória e o aluno troca no primeiro acesso.</p>
    <form onSubmit={create} className="g-col" style={{ gap: 8, marginTop: 8 }}>
      <label className="g-field"><span className="g-mut g-xs">Nome</span><input value={name} onChange={e => setName(e.target.value)} required minLength={2} data-testid="pc-name" /></label>
      <label className="g-field"><span className="g-mut g-xs">E-mail</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} required data-testid="pc-email" /></label>
      {msg && <p className="g-bad2 g-sm" role="alert">{msg}</p>}
      <button className="g-btn" disabled={busy} data-testid="pc-create">{busy ? 'Criando…' : 'Criar conta do aluno'}</button>
    </form>
    {cred && <div className="g-card v42-cred" data-testid="pc-cred" style={{ marginTop: 10 }}>
      <b>Senha provisória (aparece só agora)</b>
      <p className="g-sm">{cred.email}</p>
      <code data-testid="pc-temp" style={{ fontSize: 18 }}>{cred.pw}</code>
      <div className="g-actions" style={{ marginTop: 8 }}>
        <button className="g-btn" onClick={() => navigator.clipboard?.writeText(`E-mail: ${cred.email}\nSenha provisória: ${cred.pw}`)}>Copiar acesso</button>
        <button className="g-btn g-ghost" onClick={() => setCred(null)}>Já enviei</button></div></div>}
    <h4 className="g-h3" style={{ marginTop: 14 }}>Alunos criados por você</h4>
    {err && <p className="g-warn g-sm">{err}</p>}
    {d && !d.clients.length && <p className="g-xs g-mut">Nenhum ainda.</p>}
    {d?.clients.map(c => <div key={c.id} className="g-row" style={{ justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--ag-line,#ffffff14)' }}>
      <div><b className="g-sm">{c.name}</b><p className="g-xs g-mut" style={{ margin: 0 }}>{c.email} · {c.pending_first_login ? 'aguardando 1º acesso' : 'ativo'}</p></div>
      <button className="g-btn g-ghost" onClick={() => reset(c)} data-testid="pc-reset">Nova senha</button></div>)}
  </section>
}

// ---------- histórico de fichas (somente leitura) ----------
export function PlanHistory({ plans }) {
  const [open, setOpen] = useState(null)
  if (!plans?.length) return null
  return <section className="g-card" data-testid="plan-history" style={{ marginTop: 12 }}>
    <h3 className="g-h3">Fichas anteriores</h3>
    <p className="g-xs g-mut">Somente leitura. A ficha nova do personal sempre substitui a anterior.</p>
    {plans.map(p => <div key={p.id} style={{ borderTop: '1px solid var(--ag-line,#ffffff14)', padding: '8px 0' }}>
      <button className="g-btn g-ghost g-block" style={{ justifyContent: 'space-between' }} onClick={() => setOpen(open === p.id ? null : p.id)}>
        <span>{p.title}</span><span className="g-xs g-mut">{p.archived_at ? 'até ' + new Date(p.archived_at).toLocaleDateString('pt-BR') : 'arquivada'}</span></button>
      {open === p.id && <ul className="g-sm" style={{ margin: '6px 0 0 16px' }}>{(p.exercises || []).map((x, i) => <li key={i}>{x.name || x.exercise_name || x.exercise_id} — {x.sets}×{x.reps}</li>)}</ul>}
    </div>)}
  </section>
}

// ---------- admin: liberações ----------
export function AdmLiberacoes() {
  const [d, err, reload] = useLoad(() => api('/api/adm/access')), [msg, setMsg] = useState('')
  const act = async (p, b) => { setMsg(''); try { await post(p, b); reload() } catch (e) { setMsg(e.message) } }
  if (err) return <p className="g-warn">{err}</p>
  if (!d) return <p className="adm-sub">Carregando…</p>
  const pend = d.requests.filter(r => r.status === 'pendente')
  return <div data-testid="adm-liberacoes">
    {msg && <p className="g-warn">{msg}</p>}
    <h2>Pedidos de liberação ({pend.length} pendentes)</h2>
    <table className="adm-table"><thead><tr><th>Quando</th><th>Conta</th><th>Tipo</th><th>Motivo</th><th>Status</th><th></th></tr></thead><tbody>
      {d.requests.map(r => <tr key={r.id}><td>{dt(r.created_at)}</td><td>{r.name}<br /><small>{r.email}</small></td><td>{r.account_type === 'personal_client' ? 'Aluno de ' + (r.coach_name || 'personal') : 'Normal'}</td><td>{r.reason || '—'}</td><td>{r.status}</td>
        <td>{r.status === 'pendente' && <><button className="adm-btn" data-testid="lib-aprovar" onClick={() => act('/api/adm/access/decide', { id: r.id, action: 'aprovar' })}>Aprovar</button> <button className="adm-btn ghost" onClick={async () => { const n = await askText('Recusar o pedido?', { text: 'Motivo da recusa (opcional). A pessoa verá esta nota.', ok: 'Recusar', danger: true }); if (n != null) act('/api/adm/access/decide', { id: r.id, action: 'recusar', note: n }) }}>Recusar</button></>}</td></tr>)}
    </tbody></table>
    <h2 style={{ marginTop: 24 }}>Contas travadas ({d.locked_users.length})</h2>
    <table className="adm-table"><thead><tr><th>Conta</th><th>Tipo</th><th>Criada</th><th></th></tr></thead><tbody>
      {d.locked_users.map(x => <tr key={x.id}><td>{x.name}<br /><small>{x.email}</small></td><td>{x.account_type === 'personal_client' ? 'Aluno de ' + (x.coach_name || 'personal') : 'Normal'}</td><td>{dt(x.created_at)}</td>
        <td><button className="adm-btn" data-testid="lib-desbloquear" onClick={() => act('/api/adm/access/set', { user_id: x.id, unlocked: true })}>Liberar</button></td></tr>)}
    </tbody></table>
    <BlockUser onDone={reload} />
  </div>
}
function BlockUser({ onDone }) {
  const [email, setEmail] = useState(''), [msg, setMsg] = useState('')
  const go = async e => { e.preventDefault(); setMsg(''); try { await post('/api/adm/access/set', { email, unlocked: false }); setMsg('Conta travada.'); setEmail(''); onDone() } catch (e) { setMsg(e.message) } }
  return <form onSubmit={go} style={{ marginTop: 20 }}><h2>Travar uma conta</h2><p className="adm-sub">A conta continua vendo as telas, mas as ações ficam travadas. Nenhum dado é apagado.</p>
    <input type="email" placeholder="e-mail da conta" value={email} onChange={e => setEmail(e.target.value)} required /> <button className="adm-btn ghost">Travar</button> {msg && <span>{msg}</span>}</form>
}

// ---------- LGPD: exportação por e-mail ----------
export function ExportRequest() {
  const [d, , reload] = useLoad(() => api('/api/me/export-request'))
  const [pw, setPw] = useState(''), [em, setEm] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [open, setOpen] = useState(false)
  const send = async e => {
    e.preventDefault(); setBusy(true); setMsg('')
    try { const r = await post('/api/me/export-request', { password: pw, email: em }); setMsg(r.message); setPw(''); setEm(''); setOpen(false); reload() }
    catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }
  const last = d?.requests?.[0]
  return <div data-testid="export-request">
    <p className="g-sm g-mut">Receba uma cópia dos seus dados (LGPD, portabilidade). O arquivo é enviado ao e-mail da conta; não há download direto. Limite: 1 pedido a cada 24 h.</p>
    {last && <p className="g-xs" data-testid="export-last">Último pedido: {dt(last.created_at)} · {last.mail_status === 'enviado' ? 'enviado' : 'na fila de envio'}</p>}
    {d && !d.mail_configured && <p className="g-xs g-mut">O envio de e-mails ainda está sendo configurado; seu pedido fica na fila e sai assim que estiver pronto.</p>}
    {!open ? <button className="g-btn g-ghost" onClick={() => setOpen(true)} data-testid="export-open">Pedir cópia dos meus dados</button> :
      <form onSubmit={send} className="g-col" style={{ gap: 8 }}>
        <label className="g-field"><span className="g-mut g-xs">Confirme sua senha</span><input type="password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} required data-testid="export-pw" /></label>
        <label className="g-field"><span className="g-mut g-xs">Digite o e-mail da conta</span><input type="email" value={em} onChange={e => setEm(e.target.value)} required data-testid="export-email" /></label>
        <div className="g-actions"><button className="g-btn" disabled={busy} data-testid="export-send">Enviar para meu e-mail</button><button type="button" className="g-btn g-ghost" onClick={() => setOpen(false)}>Cancelar</button></div>
      </form>}
    {msg && <p className="g-sm" role="status" data-testid="export-msg">{msg}</p>}
  </div>
}
