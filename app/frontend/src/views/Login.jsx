import { useStore, hasData } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { authLogin, authRegister } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { useState, useEffect, lazy, Suspense } from 'react'
import InstallButton from '../components/InstallButton.jsx'
import './login.css'

// three.js só é baixado depois que a tela de login já está pintada.
const Body3D = lazy(() => import('../components/Body3D.jsx'))
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function Hero() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const go = () => setShow(true)
    const id = window.requestIdleCallback ? requestIdleCallback(go, { timeout: 1200 }) : setTimeout(go, 300)
    return () => (window.cancelIdleCallback ? cancelIdleCallback(id) : clearTimeout(id))
  }, [])
  return (
    <div className="lg-hero" aria-hidden="true">
      <div className="lg-glow" />
      {show && <Suspense fallback={null}><Body3D hero /></Suspense>}
    </div>
  )
}

function Eye({ off }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M3 3l18 18" />}</svg>
}


export default function Login() {
  const { setUser, pullState, setGuest } = useStore()
  const [mode, setMode] = useState('login')       // 'login' | 'register'
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' })
  const [errs, setErrs] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
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
    setErrs(e); return !Object.keys(e).length
  }
  const submit = async ev => {
    ev.preventDefault()
    if (busy || !validate()) return
    setBusy(true); setMsg('')
    try {
      const u = reg ? await authRegister(f.name.trim(), f.email.trim(), f.password) : await authLogin(f.email.trim(), f.password)
      setUser(u); await pullState()
      useUI.getState().toast(reg ? `Bem-vindo(a), ${u.name}!` : `Bem-vindo(a) de volta, ${u.name}!`)
    } catch (e) {
      if (e.errors) setErrs(e.errors)
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
        {reg && field('name', 'Nome', 'text', 'name', { maxLength: 80 })}
        {field('email', 'E-mail', 'email', 'email', { inputMode: 'email', placeholder: 'voce@email.com' })}
        {field('password', 'Senha', showPw ? 'text' : 'password', reg ? 'new-password' : 'current-password')}
        {reg && field('confirm', 'Confirmar senha', showPw ? 'text' : 'password', 'new-password')}
        {!reg && <button type="button" className="lg-forgot" onClick={() => setMsg('Recuperação de senha em breve — por enquanto, fale com a sua academia.')}>Esqueci a senha</button>}
        {msg && <div className="lg-msg" role="alert">{msg}</div>}
        <button className="lg-btn" type="submit" disabled={busy}>{busy ? 'Aguarde…' : reg ? 'Criar conta' : 'Entrar'}</button>
        <button type="button" className="lg-btn ghost" onClick={() => { setMode(reg ? 'login' : 'register'); setErrs({}); setMsg('') }}>
          {reg ? 'Já tenho conta — Entrar' : 'Criar conta'}</button>
        <div className="lg-alt">
          <button type="button" className="lg-link" onClick={() => setGuest(true)}>Usar sem conta</button>
        </div>
        <InstallButton />
        <div className="lg-credit">Modelo 3D: <a href="https://github.com/LluisV/Z-Anatomy" target="_blank" rel="noopener">Z-Anatomy</a> (BodyParts3D/DBCLS) — <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a> · Baseado no openGym (AGPL-3.0)</div>
      </form>
    </div>
  )
}
