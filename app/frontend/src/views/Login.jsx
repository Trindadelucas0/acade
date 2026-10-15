import { useStore, hasData } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { authLogin, authRegister, api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { useState, useEffect } from 'react'
import { useTerms, TermsText } from './app/Terms.jsx'
import InstallButton from '../components/InstallButton.jsx'
import './login.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const mq = q => typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q) : null
function useMedia(q) {
  const [on, setOn] = useState(() => !!mq(q)?.matches)
  useEffect(() => {
    const m = mq(q); if (!m) return
    const f = () => setOn(m.matches); f()
    m.addEventListener?.('change', f); return () => m.removeEventListener?.('change', f)
  }, [q])
  return on
}

// Capa do login: no desktop, vídeo de fundo em tela cheia (poster se reduced-motion);
// no mobile, foto (Pexels License). O vídeo só é renderizado no desktop, então o mobile não o baixa.
// O modelo 3D continua no resto do app.
function Hero() {
  const desk = useMedia('(min-width: 900px)')
  const still = useMedia('(prefers-reduced-motion: reduce)')
  return (
    <div className={'lg-hero' + (desk ? ' lg-hero-video' : '')} aria-hidden="true">
      {desk ? (still
        ? <img src="/brand/login-bg-poster.jpg" alt="" />
        : <video autoPlay muted loop playsInline preload="auto" poster="/brand/login-bg-poster.jpg">
            <source src="/video/login-bg.webm" type="video/webm" />
            <source src="/video/login-bg.mp4" type="video/mp4" />
          </video>)
        : <picture>
            <source srcSet="/brand/login-hero.webp" type="image/webp" />
            <img src="/brand/login-hero.jpg" alt="" width="1200" height="1800" fetchpriority="high" decoding="async" />
          </picture>}
      <div className="lg-shade" />
    </div>
  )
}

function Eye({ off }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}</svg>
}


function ResetPassword({ token }) {
  const [pw, setPw] = useState(''), [pw2, setPw2] = useState(''), [msg, setMsg] = useState(''), [done, setDone] = useState(false)
  const go = async e => { e.preventDefault(); if (pw.length < 8) return setMsg('A senha deve ter pelo menos 8 caracteres'); if (pw !== pw2) return setMsg('As senhas não conferem')
    try { await api('/api/auth/reset', { method: 'POST', body: JSON.stringify({ token, password: pw }) }); setDone(true) } catch (er) { setMsg(er.message) } }
  return <div className="lg-wrap"><form className="lg-card" onSubmit={go}>
    <div className="lg-brand">AVADESK <b>Fitness</b></div>
    {done ? <><p className="lg-sub">Senha alterada! Entre com a nova senha.</p><button type="button" className="lg-btn" onClick={() => { location.hash = '#/hoje' }}>Ir para o login</button></> : <>
      <p className="lg-sub">Crie uma nova senha.</p>
      <label className="lg-field"><span>Nova senha</span><div className="lg-input"><input type="password" autoComplete="new-password" value={pw} onChange={e => setPw(e.target.value)} /></div></label>
      <label className="lg-field"><span>Confirmar senha</span><div className="lg-input"><input type="password" autoComplete="new-password" value={pw2} onChange={e => setPw2(e.target.value)} /></div></label>
      {msg && <div className="lg-msg" role="alert">{msg}</div>}
      <button className="lg-btn" type="submit">Salvar nova senha</button></>}
  </form></div>
}

export default function Login() {
  const resetToken = /^#\/redefinir\?t=([\w-]+)/.exec(location.hash)?.[1]
  return resetToken ? <ResetPassword token={resetToken} /> : <LoginForm />
}

function LoginForm() {
  const terms = useTerms(), [agree, setAgree] = useState(false), [readTerms, setReadTerms] = useState(false)
  const { setUser, pullState, setGuest } = useStore()
  const [mode, setMode] = useState('login')       // 'login' | 'register'
  const [intent, setIntent] = useState('aluno')   // V3: 'Quero treinar' | 'Sou profissional'
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errs, setErrs] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [exists, setExists] = useState(false)   // cadastro com e-mail que já tem conta
  const reg = mode === 'register'
  const set = k => e => { setF({ ...f, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); setMsg('') }

  const validate = () => {
    const e = {}
    if (reg && f.name.trim().length < 2) e.name = 'Informe seu nome'
    if (!f.email.trim()) e.email = 'Informe seu e-mail'
    else if (!EMAIL_RE.test(f.email.trim())) e.email = 'E-mail inválido'
    if (!f.password) e.password = 'Informe sua senha'
    else if (reg && f.password.length < 8) e.password = 'A senha deve ter pelo menos 8 caracteres'
    if (reg && f.confirm !== f.password) e.confirm = 'As senhas não conferem'
    if (reg && terms && !agree) e.terms = 'Aceite os termos de uso para criar a conta'
    setErrs(e); return !Object.keys(e).length
  }
  const submit = async ev => {
    ev.preventDefault()
    if (busy || !validate()) return
    setBusy(true); setMsg('')
    try {
      const u = reg ? await authRegister(f.name.trim(), f.email.trim(), f.password, terms && agree ? terms.version : undefined, intent) : await authLogin(f.email.trim(), f.password)
      setUser(u); await pullState()
      useUI.getState().toast(reg ? `Bem-vindo(a), ${u.name}!` : `Bem-vindo(a) de volta, ${u.name}!`)
    } catch (e) {
      if (e.errors) setErrs(e.errors)
      setExists(reg && e.code === 'EMAIL_EXISTS')
      setMsg(e.status === 0 || !e.status ? 'Não foi possível conectar ao servidor' : e.message)
    } finally { setBusy(false) }
  }
  const field = (k, label, type, auto, extra) => (
    <label className={'lg-field' + (errs[k] ? ' err' : '')}>
      <span>{label}</span>
      <div className="lg-input">
        <input type={type} autoComplete={auto} value={f[k]} onChange={set(k)} aria-invalid={!!errs[k]} {...extra} />
        {(k === 'password' || k === 'confirm') && <button type="button" className="lg-eye" onClick={() => setShowPw(!showPw)}
          aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}><Eye off={showPw} /></button>}
      </div>
      {errs[k] && <em>{errs[k]}</em>}
    </label>
  )

  if (DEMO) return (
    <div className="lg-wrap"><Hero />
      <div className="lg-card">
        <div className="lg-brand">AVADESK <b>Fitness</b></div>
        <p className="lg-sub">Demonstração — tudo fica neste navegador.</p>
        <button className="lg-btn" onClick={() => setGuest(true)}>Iniciar demonstração</button>
        <a className="lg-link" href={REPO} target="_blank" rel="noopener">Código-fonte</a>
      </div>
    </div>
  )

  return (
    <div className="lg-wrap">
      <Hero />
      <form className="lg-card" onSubmit={submit} noValidate>
        <div className="lg-brand">AVADESK <b>Fitness</b></div>
        <p className="lg-sub">{reg ? 'Crie sua conta e comece a treinar.' : 'Seu treino, seu corpo, sua evolução.'}</p>
        {reg && <div className="lg-intent" role="radiogroup" aria-label="Como você vai usar">
          {[['aluno', 'Quero treinar', 'Treinos, programas, progresso e desafios'], ['profissional', 'Sou profissional', 'Prescreva para alunos depois da verificação']].map(([k, t, d]) =>
            <button key={k} type="button" role="radio" aria-checked={intent === k} className={'lg-intent-op' + (intent === k ? ' on' : '')} onClick={() => setIntent(k)} data-testid={'intent-' + k}><b>{t}</b><small>{d}</small></button>)}
        </div>}
        {reg && intent === 'profissional' && <p className="lg-sub" style={{ marginTop: 0 }} data-testid="intent-pro-note">Você também poderá treinar com a mesma conta. Enviar treinos só depois da verificação do registro profissional.</p>}
        {reg && field('name', 'Nome', 'text', 'name', { maxLength: 80 })}
        {field('email', 'E-mail', 'email', 'email', { inputMode: 'email', placeholder: 'voce@email.com' })}
        {field('password', 'Senha', showPw ? 'text' : 'password', reg ? 'new-password' : 'current-password')}
        {reg && field('confirm', 'Confirmar senha', showPw ? 'text' : 'password', 'new-password')}
        {reg && terms && <div className={'lg-terms' + (errs.terms ? ' err' : '')}>
          <label><input type="checkbox" checked={agree} onChange={e => { setAgree(e.target.checked); setErrs({ ...errs, terms: undefined }) }} data-testid="accept-terms" />
            <span>Li e aceito os <button type="button" className="lg-forgot" onClick={() => setReadTerms(!readTerms)}>termos de uso e a política de privacidade</button> (versão {terms.version})</span></label>
          {readTerms && <div className="lg-terms-box"><TermsText terms={terms} /></div>}
          {errs.terms && <em>{errs.terms}</em>}
        </div>}
        {!reg && <button type="button" className="lg-forgot" onClick={async () => {
          if (!EMAIL_RE.test(f.email.trim())) return setErrs({ ...errs, email: 'Informe seu e-mail acima para recuperar o acesso' })
          try { const r = await api('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email: f.email.trim() }) }); setMsg(r.message) } catch (e) { setMsg(e.message) } }}>Esqueci a senha</button>}
        {msg && <div className="lg-msg" role="alert">{msg}</div>}
        {exists && reg && <div className="lg-alt" data-testid="email-exists">
          <button type="button" className="lg-link" onClick={() => { setMode('login'); setErrs({}); setMsg(''); setExists(false) }}>Entrar com este e-mail</button>
          <button type="button" className="lg-link" onClick={async () => { try { const r = await api('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email: f.email.trim() }) }); setMsg(r.message) } catch (e) { setMsg(e.message) } setExists(false) }}>Recuperar a senha</button>
        </div>}
        <button className="lg-btn" type="submit" disabled={busy}>{busy ? 'Aguarde…' : reg ? 'Criar conta' : 'Entrar'}</button>
        <button type="button" className="lg-btn ghost" onClick={() => { setMode(reg ? 'login' : 'register'); setErrs({}); setMsg('') }}>
          {reg ? 'Já tenho conta — Entrar' : 'Criar conta'}</button>
        <InstallButton />
      </form>
    </div>
  )
}
