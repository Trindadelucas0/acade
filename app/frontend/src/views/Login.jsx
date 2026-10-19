import Brand from '../components/Brand.jsx'
import { useStore, hasData } from '../store/useStore.js'
import ContactFields from '../components/ContactFields.jsx'
import { EMPTY_CONTACT, validateContact, toApi } from '../lib/contact.js'
import '../components/contact.css'
import { useUI } from '../store/useUI.js'
import { authLogin, authRegister, api } from '../lib/api.js'
import { t } from '../lib/i18n.js'
import { DEMO, REPO } from '../lib/demo.js'
import { useState, useEffect } from 'react'
import { useTerms, TermsText } from './app/Terms.jsx'
import { readRef, saveRef } from './billing/Referral.jsx'   // Monetizacao F5
import { PlanCard, SELLABLE } from './billing/PlansShowcase.jsx'
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
            <img src="/brand/login-hero.jpg" alt="" width="1200" height="1800" fetchPriority="high" decoding="async" />
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
    <div className="lg-brand"><Brand /></div>
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
  const entry = new URLSearchParams(location.hash.split('?')[1] || '')
  const requestedProfile = ['aluno', 'profissional'].includes(entry.get('perfil')) ? entry.get('perfil') : 'aluno'
  const requestedPlan = entry.get('plano') || ''
  const terms = useTerms(), [agree, setAgree] = useState(false), [readTerms, setReadTerms] = useState(false)
  const [health, setHealth] = useState(false)   // consentimento de saude opcional (BUG-027: 18+ vem da data de nascimento)
  const maxBirth = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().slice(0, 10) })()
  const { setUser, pullState, setGuest } = useStore()
  const [mode, setMode] = useState(() => location.hash.startsWith('#/cadastro') || /[?&]cadastro=1/.test(location.hash) ? 'register' : 'login')       // 'login' | 'register'
  const [intent, setIntent] = useState(requestedProfile)   // V3: 'Quero treinar' | 'Sou profissional'
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', pro_code: '', birth_date: '' })
  const [errs, setErrs] = useState({})
  const [ct, setCt] = useState(EMPTY_CONTACT)   // V5: telefone + endereco no cadastro
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [exists, setExists] = useState(false)   // cadastro com e-mail que já tem conta
  const reg = mode === 'register'
  // Link /convite/CODIGO: guarda a oferta e abre o cadastro com o cupom configurado pelo administrador.
  const [ref, setRef] = useState(() => readRef())
  const [coupon, setCoupon] = useState(() => readRef()?.coupon || '')
  // Monetizacao F8b: cadastro em 6 etapas (perfil, dados, assinatura, contratar ou cupom, confirmacao, onboarding)
  const [step, setStep] = useState(1), [choice, setChoice] = useState(() => requestedPlan || (entry.get('inicio') === 'gratis' ? 'depois' : readRef()?.offer?.active && readRef()?.coupon ? 'cupom' : '')), [plans, setPlans] = useState(null), [created, setCreated] = useState(null)
  useEffect(() => { if (mode === 'register' && step === 3 && !plans) api('/api/public/plans').then(setPlans).catch(() => setPlans({ plans: [] })) }, [mode, step])
  useEffect(() => {
    if (!plans || !requestedPlan) return
    const valid = plans.plans?.some(p => p.id === requestedPlan && p.audience === intent && p.purchasable)
    if (!valid) setChoice('')
  }, [plans]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const m = /^#\/convite\/([\w-]+)/.exec(location.hash); if (!m) return
    api('/api/convite?code=' + encodeURIComponent(m[1])).then(d => { if (d?.type === 'indicacao') { saveRef(d); const r = readRef(); setRef(r); setCoupon(r?.coupon || ''); if (r?.offer?.active && ['aluno', 'profissional'].includes(r.offer.audience)) setIntent(r.offer.audience); setChoice(r?.offer?.active && r?.coupon ? 'cupom' : 'depois'); setMode('register') } }).catch(() => {})
  }, [])
  const set = k => e => { setF({ ...f, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); setMsg('') }

  const S1 = ['name', 'email', 'password', 'confirm']
  const errorsOf = () => {
    const e = {}
    if (reg && f.name.trim().length < 2) e.name = 'Informe seu nome'
    if (!f.email.trim()) e.email = 'Informe seu e-mail'
    else if (!EMAIL_RE.test(f.email.trim())) e.email = 'E-mail inválido'
    if (!f.password) e.password = 'Informe sua senha'
    else if (reg && f.password.length < 8) e.password = 'A senha deve ter pelo menos 8 caracteres'
    if (reg && f.confirm !== f.password) e.confirm = 'As senhas não conferem'
    if (reg && !agree) e.terms = 'Aceite os Termos de Uso e a Política de Privacidade para criar a conta'
    if (reg && !f.birth_date) e.birth_date = 'Informe sua data de nascimento'
    if (reg) Object.assign(e, validateContact(ct))
    if (reg && f.birth_date && f.birth_date > maxBirth) e.birth_date = 'É preciso ter 18 anos ou mais para criar a conta'
    if (reg && choice === 'cupom' && coupon.trim().length < 3) e.coupon = 'Informe o cupom ou escolha outra opção'
    return e
  }
  const stepOf = k => S1.includes(k) ? 1 : k === 'coupon' ? 4 : k === 'terms' ? 5 : 2
  const validate = () => { const e = errorsOf(); setErrs(e); if (reg && Object.keys(e).length) setStep(Math.min(...Object.keys(e).map(stepOf))); return !Object.keys(e).length }
  const next = () => {
    const e = Object.fromEntries(Object.entries(errorsOf()).filter(([k]) => stepOf(k) === step))
    setErrs(e); setMsg(''); if (Object.keys(e).length) return
    if (step === 3 && !choice) return setMsg('Escolha uma opção para continuar')
    setStep(step + 1)
  }
  const finish = async () => { setUser(created.u); await pullState(); useUI.getState().toast(`Bem-vindo(a), ${created.u.name}!`); if (created.plan) location.hash = '#/assinatura?plano=' + created.plan }
  const submit = async ev => {
    ev.preventDefault()
    if (reg && step < 5) return next()   // Enter nas etapas = Continuar
    if (busy || !validate()) return
    setBusy(true); setMsg('')
    try {
      const result = reg ? await authRegister(f.name.trim(), f.email.trim(), f.password, terms && agree ? terms.version : undefined, intent, intent === 'aluno' ? f.pro_code.trim() : '', { accept: agree, birth_date: f.birth_date, health, contact: toApi(ct), coupon: choice === 'cupom' ? coupon.trim() : '' }) : null
      const u = reg ? result.user : await authLogin(f.email.trim(), f.password)
      const cr = result?.coupon_result
      const trial = cr ? (cr.status < 300 ? { ok: true, ...cr } : { ok: false, t: cr.error, code: cr.code }) : null
      if (reg) { try { localStorage.removeItem('avagym_ref') } catch { /* */ } setCreated({ u, trial, plan: choice && !['cupom', 'depois'].includes(choice) ? choice : null }); setStep(6); return }
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
        <div className="lg-brand"><Brand /></div>
        <p className="lg-sub">Demonstração — tudo fica neste navegador.</p>
        <button className="lg-btn" onClick={() => setGuest(true)}>Iniciar demonstração</button>
        <a className="lg-link" href={REPO} target="_blank" rel="noopener">Código-fonte</a>
      </div>
    </div>
  )

  if (mode === 'forgot') return <div className="lg-wrap"><Hero /><form className="lg-card" onSubmit={async e => {
    e.preventDefault()
    if (!EMAIL_RE.test(f.email.trim())) return setErrs({email:'Informe um e-mail válido'})
    setBusy(true); setMsg('')
    try { const r = await api('/api/auth/forgot', {method:'POST',body:JSON.stringify({email:f.email.trim()})}); setMsg(r.message) }
    catch (e) { setMsg(e.message) } finally { setBusy(false) }
  }}><div className="lg-brand"><Brand /></div><h1>Recuperar acesso</h1><p className="lg-sub">Informe seu e-mail para receber o link de recuperação.</p>
    {field('email','E-mail','email','email',{inputMode:'email'})}
    {msg && <p className="lg-msg" role="status">{msg}</p>}
    <button className="lg-btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar link de recuperação'}</button>
    <button type="button" className="lg-btn ghost" onClick={() => {setMode('login');setMsg('');setErrs({})}}>Voltar para entrar</button>
  </form></div>
  if (reg && step === 6 && created) return <div className="lg-wrap"><Hero /><div className="lg-card" data-testid="signup-onboarding">
    <div className="lg-brand"><Brand /></div><p className="lg-sub" style={{ marginTop: 0 }}>Etapa 6 de 6 · Pronto</p>
    <h1>Conta criada, {created.u.name.split(' ')[0]}!</h1>
    {created.trial?.ok && <p className="lg-sub" data-testid="onb-trial">Seu acesso de {created.trial.days} dias começou. Você tem acesso até {new Date(created.trial.ends_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.</p>}
    {created.trial && !created.trial.ok && <p className="lg-msg" role="alert">O cupom não foi aplicado: {created.trial.t} Você pode tentar de novo em Planos e pagamento.</p>}
    {created.plan && <p className="lg-sub">Agora vamos abrir Planos e pagamento para concluir a assinatura.</p>}
    <ul className="lg-sub" style={{ textAlign: 'left' }}>{(intent === 'profissional'
      ? ['Envie seu registro profissional para verificação (Perfil).', 'Monte seus treinos e programas.', 'Convide alunos pelo seu código ou link.']
      : ['Faça a avaliação inicial para receber um treino sob medida.', 'Siga o treino de hoje na aba Hoje.', 'Entre nos desafios da comunidade.']).map(x => <li key={x}>{x}</li>)}</ul>
    <button className="lg-btn" onClick={finish} data-testid="onb-start">{created.plan ? 'Ir para o pagamento' : 'Começar'}</button>
  </div></div>
  return (
    <div className="lg-wrap">
      <Hero />
      <form className="lg-card" onSubmit={submit} noValidate>
        <div className="lg-brand"><Brand /></div>
        <p className="lg-sub">{reg ? 'Crie sua conta e comece a treinar.' : 'Seu progresso começa aqui'}</p>
        {reg && step < 6 && <p className="lg-sub" data-testid="signup-step" style={{ marginTop: 0 }}>Etapa {step} de 6 · {['Perfil', 'Seus dados', 'Assinatura', choice === 'cupom' ? 'Cupom' : 'Contratar', 'Confirmação'][step - 1]}</p>}
        {reg && step === 1 && <div className="lg-intent" role="radiogroup" aria-label="Como você vai usar">
          {[['aluno', 'Quero treinar', 'Treinos, programas, progresso e desafios'], ['profissional', 'Sou profissional', 'Prescreva para alunos depois da verificação']].map(([k, t, d]) =>
            <button key={k} type="button" role="radio" aria-checked={intent === k} disabled={!!ref?.offer?.active && k !== ref.offer.audience} className={'lg-intent-op' + (intent === k ? ' on' : '')} onClick={() => { setIntent(k); if (k !== requestedProfile) setChoice('') }} data-testid={'intent-' + k}><b>{t}</b><small>{d}</small></button>)}
        </div>}
        {reg && step === 1 && ref?.offer?.active && <p className="lg-sub" style={{ marginTop: 0 }}>Este cupom é exclusivo para {ref.offer.audience === 'profissional' ? 'Profissional — PRO' : 'Aluno — Individual'}.</p>}
        {reg && step === 1 && intent === 'profissional' && <p className="lg-sub" style={{ marginTop: 0 }} data-testid="intent-pro-note">Você também poderá treinar com a mesma conta. Enviar treinos só depois da verificação do registro profissional.</p>}
        {(!reg || step === 1) && <>
        {reg && field('name', 'Nome', 'text', 'name', { maxLength: 80 })}
        {field('email', 'E-mail', 'email', 'email', { inputMode: 'email', placeholder: 'voce@email.com' })}
        {field('password', 'Senha', showPw ? 'text' : 'password', reg ? 'new-password' : 'current-password')}
        {reg && field('confirm', 'Confirmar senha', showPw ? 'text' : 'password', 'new-password')}
        </>}
        {reg && (step === 1 || step === 4) && ref && <p className="lg-sub" data-testid="ref-banner">Você chegou pelo convite de <b>{ref.name || 'um amigo'}</b>. {ref.offer?.active ? `A oferta libera ${ref.offer.trial_days} dias de ${ref.offer.audience === 'profissional' ? 'PRO' : 'Individual'}.` : 'O limite ou a validade desta oferta terminou; seu cadastro pode continuar normalmente.'}</p>}
        {reg && step === 1 && ref?.offer?.active && <label className="lg-field"><span>Cupom do convite</span><div className="lg-input"><input value={coupon} readOnly maxLength={32} autoComplete="off" data-testid="signup-coupon" /></div><small className="lg-hint">Aplicado automaticamente ao concluir o cadastro, sem cobrança automática.</small></label>}
        {reg && step === 2 && intent === 'aluno' && <>{field('pro_code', 'Código do seu personal (opcional)', 'text', 'off', { maxLength: 16, autoCapitalize: 'characters', placeholder: 'Ex.: M6ESAW9W' })}<p className="lg-sub" style={{ marginTop: -4 }} data-testid="pro-code-note">Tem um personal? Com o código dele, sua conta já entra vinculada e coberta pelo plano dele, sem mensalidade.</p></>}
        {reg && step === 2 && field('birth_date', 'Data de nascimento', 'date', 'bday', { max: maxBirth, min: '1900-01-01', 'aria-required': true, 'data-testid': 'birth-date' })}
        {reg && step === 2 && <fieldset className="lg-contact" data-testid="signup-contact"><legend className="lg-sub">Contato e endereço <small>(privados; você escolhe o que mostrar no perfil)</small></legend>
          <ContactFields value={ct} onChange={v => { setCt(v); setErrs({}) }} errors={errs} cls="lg-in" fieldCls="lg-field" /></fieldset>}
        {reg && step === 2 && <div className="lg-terms" data-testid="signup-consents">
              <label><input type="checkbox" checked={health} onChange={e => setHealth(e.target.checked)} data-testid="accept-health" />
                <span>(Opcional) Autorizo o uso dos meus dados de saúde (dores, lesões, restrições) para adaptar os treinos. Posso retirar quando quiser.</span></label>
            </div>}
        {reg && step === 3 && <div data-testid="signup-plans" className="lg-intent pl-signup" role="radiogroup" aria-label="Como quer começar">
          {(plans?.plans || []).filter(p => SELLABLE.includes(p.id) && p.audience === intent).map(p => <PlanCard key={p.id} p={p} compact selected={choice === p.id} onSelect={p.purchasable ? () => setChoice(p.id) : undefined} />)}
          <button type="button" role="radio" aria-checked={choice === 'cupom'} className={'lg-intent-op' + (choice === 'cupom' ? ' on' : '')} onClick={() => setChoice('cupom')} data-testid="signup-choice-cupom"><b>Tenho um cupom ou código de indicação</b><small>O período e o plano dependem do cupom, sem cartão</small></button>
          <button type="button" role="radio" aria-checked={choice === 'depois'} className={'lg-intent-op' + (choice === 'depois' ? ' on' : '')} onClick={() => setChoice('depois')} data-testid="signup-choice-depois"><b>Decidir depois</b><small>Crie a conta agora e escolha o plano em Planos e pagamento</small></button>
          {!plans && <p className="lg-sub">Carregando planos…</p>}
        </div>}
        {reg && step === 4 && choice === 'cupom' && <label className={'lg-field' + (errs.coupon ? ' err' : '')}><span>Cupom</span><div className="lg-input"><input value={coupon} onChange={e => { setCoupon(e.target.value.toUpperCase()); setErrs({ ...errs, coupon: undefined }) }} maxLength={32} autoComplete="off" placeholder="Cupom ou código de um amigo" data-testid="signup-coupon" /></div><small className="lg-hint">A duração e o plano são validados pelo cupom. O período gratuito é único por pessoa e não gera cobrança automática.</small>{errs.coupon && <em>{errs.coupon}</em>}</label>}
        {reg && step === 4 && choice === 'depois' && <p className="lg-sub" data-testid="signup-later">Sem problema. Depois de criar a conta, você escolhe o plano ou ativa um cupom em Perfil › Planos e pagamento.</p>}
        {reg && step === 4 && choice && !['cupom', 'depois'].includes(choice) && <p className="lg-sub" data-testid="signup-pay-note">Depois de criar a conta, abrimos <b>Planos e pagamento</b> com o plano escolhido para você informar o cartão com segurança. Nada é cobrado antes da sua confirmação.</p>}
        {reg && step === 5 && <div className="lg-sub" data-testid="signup-summary" style={{ textAlign: 'left' }}>
          <p><b>{f.name}</b> · {f.email}<br />{intent === 'profissional' ? 'Profissional' : 'Aluno'}{intent === 'aluno' && f.pro_code ? ' · código do personal ' + f.pro_code : ''}</p>
          <p>{choice === 'cupom' ? `Cupom ${coupon}: benefício conforme a oferta` : choice === 'depois' ? 'Plano: decidir depois' : `Plano: ${plans?.plans?.find(p => p.id === choice)?.name || choice} (pagamento na próxima tela)`}</p>
        </div>}
            {reg && step === 5 && <div className={'lg-terms' + (errs.terms ? ' err' : '')}>
          <label><input type="checkbox" checked={agree} onChange={e => { setAgree(e.target.checked); setErrs({ ...errs, terms: undefined }) }} data-testid="accept-terms" />
            <span>Li e aceito os <a href="#/legal/termos" target="_blank" rel="noopener" className="lg-forgot">Termos de Uso</a> e a <a href="#/legal/privacidade" target="_blank" rel="noopener" className="lg-forgot">Política de Privacidade</a>{terms ? <> (versão {terms.version}, <button type="button" className="lg-forgot" onClick={() => setReadTerms(!readTerms)}>ler aqui</button>)</> : null}</span></label>
          {readTerms && terms && <div className="lg-terms-box"><TermsText terms={terms} /></div>}
          {errs.terms && <em>{errs.terms}</em>}
        </div>}
        {!reg && <button type="button" className="lg-forgot" onClick={() => { setMode('forgot'); setMsg(''); setErrs({}) }}>Esqueci a senha</button>}
        {msg && <div className="lg-msg" role="alert">{msg}</div>}
        {exists && reg && <div className="lg-alt" data-testid="email-exists">
          <button type="button" className="lg-link" onClick={() => { setMode('login'); setErrs({}); setMsg(''); setExists(false) }}>Entrar com este e-mail</button>
          <button type="button" className="lg-link" onClick={async () => { try { const r = await api('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email: f.email.trim() }) }); setMsg(r.message) } catch (e) { setMsg(e.message) } setExists(false) }}>Recuperar a senha</button>
        </div>}
        {reg && step < 5 && <button className="lg-btn" type="button" onClick={next} data-testid="signup-next">Continuar</button>}
        {(!reg || step === 5) && <button className="lg-btn" type="submit" disabled={busy}>{busy ? 'Aguarde…' : reg ? 'Criar conta' : 'Entrar'}</button>}
        {reg && step > 1 && <button type="button" className="lg-btn ghost" onClick={() => { setStep(step - 1); setErrs({}); setMsg('') }} data-testid="signup-back">Voltar</button>}
        <button type="button" className="lg-btn ghost" onClick={() => { setMode(reg ? 'login' : 'register'); setStep(1); setErrs({}); setMsg('') }}>
          {reg ? 'Já tenho conta — Entrar' : 'Criar conta'}</button>
        <a className="lg-forgot" href="#/precos" data-testid="see-plans" style={{ display: 'block', textAlign: 'center', marginTop: 12 }}>Conhecer os planos e preços</a>
        <InstallButton />
      </form>
    </div>
  )
}
