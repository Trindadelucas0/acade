// Monetizacao F8: estado de acesso do usuario. AccessHost (global): 402 ACCESS_REQUIRED -> tela de assinatura;
// faixa discreta de "teste ativo" com tempo restante. TrialCard: cartao na tela de assinatura (teste ativo,
// teste encerrado com dados preservados, ou campo para ativar cupom de 7 dias).
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../../lib/api.js'

export function fmtRemaining(ms) {
  if (!(ms > 0)) return 'encerrado'
  const h = Math.floor(ms / 36e5), d = Math.floor(h / 24)
  if (d >= 1) return `${d} dia${d > 1 ? 's' : ''} e ${h % 24}h`
  if (h >= 1) return `${h}h`
  return `${Math.max(1, Math.round(ms / 6e4))} min`
}
export function useAccess(dep) {
  const [a, setA] = useState(null)
  const load = () => api('/api/access/me').then(setA).catch(() => setA(null))
  useEffect(() => { load() }, [dep])
  return [a, load]
}

export function AccessHost() {
  const nav = useNavigate(), loc = useLocation()
  const [a] = useAccess(loc.pathname === '/assinatura' ? 1 : 0)
  const [hide, setHide] = useState(() => sessionStorage.getItem('avagym_trialbar') === '1')
  useEffect(() => {
    let last = 0
    const on = () => { if (Date.now() - last < 3000) return; last = Date.now(); nav('/assinatura?acesso=bloqueado') }
    window.addEventListener('avagym:access-required', on); return () => window.removeEventListener('avagym:access-required', on)
  }, [nav])
  const t = a?.trial
  if (!t?.active || hide || loc.pathname === '/assinatura') return null
  return <div className="bl-trialbar" role="status" data-testid="trial-bar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '6px 10px', fontSize: 13, background: 'var(--g-accent-soft, #eef6ff)' }}>
    <span>Teste PRO ativo · faltam <b>{fmtRemaining(t.remaining_ms)}</b></span>
    <button className="adm-btn ghost" style={{ padding: '2px 8px' }} onClick={() => nav('/assinatura')}>Assinar</button>
    <button aria-label="Fechar aviso" className="adm-btn ghost" style={{ padding: '2px 8px' }} onClick={() => { sessionStorage.setItem('avagym_trialbar', '1'); setHide(true) }}>×</button>
  </div>
}

export function TrialCard({ onChange }) {
  const [a, load] = useAccess(0), [code, setCode] = useState(''), [msg, setMsg] = useState(null), [busy, setBusy] = useState(false)
  const blocked = new URLSearchParams(location.hash.split('?')[1] || '').get('acesso') === 'bloqueado'
  if (!a) return null
  const t = a.trial
  async function redeem() {
    setBusy(true); setMsg(null)
    try { await api('/api/billing/coupon/redeem', { method: 'POST', body: JSON.stringify({ code: code.trim() }) }); setMsg({ ok: true, t: 'Seu teste de 7 dias começou!' }); setCode(''); await load(); onChange?.() }
    catch (e) { setMsg({ ok: false, t: e.message }) } finally { setBusy(false) }
  }
  return <section className="bl-sub" data-testid="trial-card">
    {t?.active && <><h2>Teste PRO ativo</h2><p data-testid="trial-remaining">Faltam <b>{fmtRemaining(t.remaining_ms)}</b> (até {new Date(t.ends_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}). Assine antes do fim para não perder o acesso aos recursos premium.</p></>}
    {!t?.active && a.monetized && !a.has_any && <div data-testid="access-required">
      <h2>{t ? 'Seu teste terminou' : 'Assine para continuar'}</h2>
      <p>{blocked ? 'Esse recurso faz parte da assinatura. ' : ''}Seus dados, treinos e histórico continuam guardados. Escolha um plano abaixo para voltar a usar treinos e comunidade.</p>
    </div>}
    {!t && a.trial_eligible && <div style={{ marginTop: 8 }}>
      <label className="adm-field">Tem um cupom de teste ou de indicação?
        <span style={{ display: 'flex', gap: 6 }}><input className="adm-in" value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="CUPOM" data-testid="trial-coupon" maxLength={40} />
          <button className="adm-btn" disabled={busy || code.trim().length < 3} onClick={redeem} data-testid="trial-redeem">Ativar 7 dias</button></span></label>
      <p className="g-xs g-mut">O teste é único por pessoa e dura 7 dias corridos (168 horas).</p>
    </div>}
    {msg && <p className={msg.ok ? 'bl-ok' : 'bl-err'} role="status">{msg.t}</p>}
  </section>
}
