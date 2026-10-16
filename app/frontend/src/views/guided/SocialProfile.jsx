// AVAGYM V5 - perfil social: card somente leitura (foto, nome, @, cidade, bio, seguidores, público/privado) com
// "Editar perfil" abrindo um modal (desktop) / bottom sheet (celular). O @identificador é escolhido uma única vez:
// disponibilidade verificada enquanto digita, aviso de que é permanente e confirmação antes de salvar.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useStore } from '../../store/useStore.js'
import AvatarEditor from '../../components/AvatarEditor.jsx'
import GSelect from '../../components/GSelect.jsx'
import { GOAL_LABEL, normHandle, validHandle } from '../../lib/socialRules.js'
import { Av } from '../app/kit.jsx'
import './guided.css'
import './socialProfile.css'

const HANDLE_RULE = 'Use de 3 a 30 letras minúsculas, números, ponto ou sublinhado (sem começar ou terminar com ponto).'

function useHandleCheck(h, enabled) {
  const [st, setSt] = useState({ state: 'idle' })
  useEffect(() => {
    if (!enabled || !h) { setSt({ state: 'idle' }); return }
    if (!validHandle(h)) { setSt({ state: 'invalid' }); return }
    setSt({ state: 'checking' }); let alive = true
    const t = setTimeout(() => api('/api/social/handle-check?h=' + encodeURIComponent(h))
      .then(r => alive && setSt({ state: r.available ? 'ok' : r.reason === 'invalid' ? 'invalid' : 'taken' }))
      .catch(() => alive && setSt({ state: 'error' })), 350)
    return () => { alive = false; clearTimeout(t) }
  }, [h, enabled])
  return st
}

function EditDialog({ d, onClose, onSaved }) {
  const locked = !!d.handle_locked
  const [f, setF] = useState({ ...d.profile }), [errs, setErrs] = useState({}), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(false)
  const box = useRef(null)
  const h = normHandle(f.handle), newHandle = !locked && !!h
  const chk = useHandleCheck(h, !locked)
  useEffect(() => {
    const prev = document.activeElement; box.current?.querySelector('input,textarea,button')?.focus()
    const onKey = e => {
      if (e.key === 'Escape' && !document.querySelector('.gs[data-open]')) { e.stopPropagation(); onClose() }
      if (e.key === 'Tab' && box.current) {   // mantém o foco dentro do diálogo
        const el = [...box.current.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea,[tabindex="0"]')]; if (!el.length) return
        if (e.shiftKey && document.activeElement === el[0]) { e.preventDefault(); el.at(-1).focus() } else if (!e.shiftKey && document.activeElement === el.at(-1)) { e.preventDefault(); el[0].focus() }
      }
    }
    document.addEventListener('keydown', onKey); const ov = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ov; prev?.focus?.() }
  }, [])
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const blocked = busy || (newHandle && chk.state !== 'ok')
  const doSave = async () => {
    setBusy(true); setMsg(''); setErrs({})
    try {
      const body = { display_name: f.display_name, bio: f.bio, goal: f.goal, city: f.city, is_private: f.is_private, ...(locked ? {} : { handle: h }) }
      await api('/api/me/social', { method: 'POST', body: JSON.stringify(body) }); onSaved('Perfil salvo.')
    } catch (e) { setErrs(e.errors || {}); setMsg(e.message); setConfirm(false) } finally { setBusy(false) }
  }
  const save = () => newHandle && !confirm ? setConfirm(true) : doSave()
  const hint = { invalid: [HANDLE_RULE, 'bad'], checking: ['Verificando disponibilidade…', 'mut'], ok: [`@${h} está disponível.`, 'ok'], taken: ['Este @ já está em uso. Escolha outro.', 'bad'], error: ['Não foi possível verificar agora.', 'bad'] }[chk.state]
  return <div className="sp-back" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
    <div className="sp-dlg" role="dialog" aria-modal="true" aria-labelledby="sp-dlg-t" ref={box} data-testid="social-edit">
      <div className="sp-grab" aria-hidden="true" />
      <header className="sp-dlg-h"><h2 id="sp-dlg-t">Editar perfil</h2><button className="sp-x" aria-label="Fechar" onClick={onClose} disabled={busy}>✕</button></header>
      {confirm ? <div className="sp-dlg-b sp-confirm" data-testid="handle-confirm">
        <p className="sp-big">@{h}</p>
        <p>Depois de salvo, este @identificador <b>não poderá ser alterado</b> e não ficará disponível para outra pessoa.</p>
        <p className="g-mut g-sm">Confira a grafia antes de confirmar.</p>
      </div> : <div className="sp-dlg-b">
        <section className="sp-sec"><h3>Identidade</h3>
          <label className="sp-f"><span>Nome de exibição</span><input className="g-in" maxLength={60} value={f.display_name} placeholder={d.name} onChange={set('display_name')} data-testid="social-name" /></label>
          {locked
            ? <div className="sp-f"><span>@identificador</span><div className="sp-locked" data-testid="social-handle-locked">@{d.profile.handle}<small>Definido. Não pode ser alterado.</small></div></div>
            : <label className="sp-f"><span>@identificador (opcional)</span>
              <div className="sp-at"><b aria-hidden="true">@</b><input className="g-in" maxLength={31} value={f.handle} placeholder="ex.: marinafit" onChange={set('handle')} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby="sp-h-hint" data-testid="social-handle" /></div>
              <small id="sp-h-hint" className={'sp-hint sp-' + (errs.handle ? 'bad' : hint?.[1] || 'mut')} data-testid="handle-status" data-state={chk.state} aria-live="polite">{errs.handle || hint?.[0] || 'Escolha com cuidado: depois de salvo, o @ não poderá ser alterado.'}</small>
            </label>}
        </section>
        <section className="sp-sec"><h3>Sobre você</h3>
          <label className="sp-f"><span>Bio <em>{160 - (f.bio || '').length} restantes</em></span><textarea className="g-in" maxLength={160} rows={3} value={f.bio} onChange={set('bio')} data-testid="social-bio" /></label>
          <div className="sp-row2">
            <label className="sp-f"><span>Cidade (opcional)</span><input className="g-in" maxLength={60} value={f.city} onChange={set('city')} data-testid="social-city" /></label>
            <label className="sp-f"><span>Objetivo (opcional)</span><GSelect label="Objetivo" value={f.goal} onChange={v => setF({ ...f, goal: v })} options={[['', 'Não mostrar'], ...Object.entries(GOAL_LABEL)]} testid="social-goal" /></label>
          </div>
        </section>
        <section className="sp-sec" data-testid="social-privacy"><h3>Quem vê meu perfil</h3>
          <div className="sp-opts" role="radiogroup" aria-label="Quem vê meu perfil">
            <label className={'sp-opt' + (!f.is_private ? ' on' : '')}><input type="radio" name="priv" checked={!f.is_private} onChange={() => setF({ ...f, is_private: false })} data-testid="social-public" /><span><b>Público</b><small>Qualquer pessoa da comunidade vê seu perfil, e você vê e participa das comunidades em geral.</small></span></label>
            <label className={'sp-opt' + (f.is_private ? ' on' : '')}><input type="radio" name="priv" checked={!!f.is_private} onChange={() => setF({ ...f, is_private: true })} data-testid="social-private" /><span><b>Privado</b><small>Só seguidores que você aprovar veem seu perfil completo, e você vê apenas as comunidades das quais participa.</small></span></label>
          </div>
        </section>
      </div>}
      {msg && <p className="sp-msg g-bad2 g-sm" role="alert" data-testid="social-msg">{msg}</p>}
      <footer className="sp-dlg-f">
        {confirm
          ? <><button className="g-btn g-ghost" onClick={() => setConfirm(false)} disabled={busy} data-testid="handle-confirm-back">Voltar</button><button className="g-btn" onClick={doSave} disabled={busy} data-testid="handle-confirm-ok">{busy ? 'Salvando…' : 'Confirmar e salvar'}</button></>
          : <><button className="g-btn g-ghost" onClick={onClose} disabled={busy} data-testid="social-cancel">Cancelar</button><button className="g-btn" onClick={save} disabled={blocked} data-testid="social-save">{busy ? 'Salvando…' : 'Salvar'}</button></>}
      </footer>
    </div>
  </div>
}

export default function SocialProfile() {
  const nav = useNavigate(), user = useStore(s => s.user)
  const [d, setD] = useState(null), [err, setErr] = useState(''), [msg, setMsg] = useState(''), [reqs, setReqs] = useState([]), [n, setN] = useState(0), [edit, setEdit] = useState(false)
  useEffect(() => {
    api('/api/me/social').then(setD).catch(e => setErr(e.message))
    api('/api/me/follow-requests').then(r => setReqs(r.requests || [])).catch(() => {})
  }, [n])
  if (err) return <div className="ag"><h1>Perfil social</h1><p className="g-warn">{err}</p></div>
  if (!d) return <div className="ag"><p className="g-mut" role="status">Carregando.</p></div>
  const p = d.profile, name = p.display_name || d.name
  const decide = async (id, accept) => { try { await api('/api/me/follow-requests', { method: 'POST', body: JSON.stringify({ follower_id: id, accept }) }); setN(x => x + 1) } catch (e) { setMsg(e.message) } }
  return <div className="ag" data-testid="social-profile">
    <button className="g-link org-back" onClick={() => nav('/perfil')}>‹ Perfil</button>
    <span className="g-eyebrow">Perfil</span><h1>Perfil social</h1>
    <p className="g-mut g-sm">É assim que você aparece na comunidade. Peso, medidas e informações de saúde nunca aparecem aqui.</p>
    <article className="sp-card" data-testid="social-card">
      <div className="sp-cover" aria-hidden="true" />
      <div className="sp-avatar"><AvatarEditor compact avatar={d.avatar} name={name} onChange={a => setD({ ...d, avatar: a })} /></div>
      <div className="sp-name-row">
        <h2 className="sp-name" data-testid="social-card-name">{name}{d.verified ? <span className="sp-ver" data-testid="social-verified" title="Profissional verificado"> ✓ Profissional verificado</span> : null}</h2>
        <span className={'sp-badge' + (p.is_private ? ' priv' : '')} data-testid="social-visibility">{p.is_private ? '🔒 Privado' : '🌐 Público'}</span>
      </div>
      <p className="sp-handle" data-testid="social-card-handle">{p.handle ? '@' + p.handle : <span className="g-mut">Sem @identificador</span>}</p>
      {(p.city || p.goal) && <p className="sp-meta">{p.city && <span data-testid="social-card-city">📍 {p.city}</span>}{p.goal && <span>🎯 {GOAL_LABEL[p.goal] || p.goal}</span>}</p>}
      <p className={'sp-bio' + (p.bio ? '' : ' g-mut')} data-testid="social-card-bio">{p.bio || 'Você ainda não escreveu uma bio.'}</p>
      <div className="sp-stats" data-testid="social-counts"><span><b>{d.followers}</b> seguidor(es)</span><span><b>{d.following}</b> seguindo</span></div>
      <div className="sp-actions">
        <button className="g-btn" onClick={() => { setMsg(''); setEdit(true) }} data-testid="social-edit-open">Editar perfil</button>
        {user?.id && <button className="g-btn g-ghost" onClick={() => nav('/u/' + user.id)} data-testid="social-preview">Ver como os outros me veem</button>}
      </div>
      {msg && <p className="g-sm" role="status" data-testid="social-saved" style={{ marginTop: 10 }}>{msg}</p>}
    </article>
    {reqs.length > 0 && <><h2>Pedidos para seguir</h2><div className="g-card g-list" data-testid="follow-requests">{reqs.map(r => <div key={r.id} className="g-row" style={{ gap: 8, padding: '6px 0' }}><Av name={r.name} url={r.avatar} size={36} /><span style={{ flex: 1 }}>{r.name}</span><button className="g-btn g-sm" onClick={() => decide(r.id, true)}>Aceitar</button><button className="g-btn g-ghost g-sm" onClick={() => decide(r.id, false)}>Recusar</button></div>)}</div></>}
    {edit && <EditDialog d={d} onClose={() => setEdit(false)} onSaved={m => { setEdit(false); setMsg(m); setN(x => x + 1) }} />}
  </div>
}