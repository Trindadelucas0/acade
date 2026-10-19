import { useEffect, useMemo, useRef, useState } from 'react'
import Brand from '../../components/Brand.jsx'
import { api } from '../../lib/api.js'
import { useStore } from '../../store/useStore.js'
import { INSTALL_GUIDE } from '../../components/install-guide.js'
import './landing.css'

const AUDIENCE = {
  aluno: {
    label: 'Quero treinar',
    title: 'Treine com direção. Enxergue sua evolução.',
    copy: 'Programas guiados, execução simples, histórico e comunidade para transformar constância em progresso.',
    image: '/landing/aluno-orny.webp',
    benefits: ['Treino guiado e organizado', 'Progresso e histórico', 'Programas e comunidade', 'Acompanhamento do personal'],
  },
  profissional: {
    label: 'Sou profissional',
    title: 'Seus alunos e treinos em uma rotina mais profissional.',
    copy: 'Prescreva, acompanhe e organize seu atendimento sem perder o vínculo humano com cada aluno.',
    image: '/landing/profissional-orny.webp',
    benefits: ['Prescrição de treinos', 'Gestão dos alunos', 'Modelos reutilizáveis', 'Acompanhamento da evolução'],
  },
}

const money = cents => cents === 0 ? 'Grátis' : (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const signupHref = (audience, plan) => `#/cadastro?perfil=${audience}${plan ? `&plano=${encodeURIComponent(plan)}` : ''}`

function PlanCard({ plan }) {
  const paid = !plan.is_free
  const name = plan.name
  const features = (plan.benefits || []).filter(x => x.state === 'disponivel').slice(0, 4).map(x => x.label)
  if (!features.length) features.push(...Object.keys(plan.features || {}).slice(0, 4).map(x => x.replaceAll('_', ' ')))
  return <article className={`lp-plan ${paid ? 'lp-plan-featured' : ''}`} data-testid={`landing-plan-${plan.id}`}>
    <div className="lp-plan-top"><span className="lp-eyebrow">{plan.audience === 'aluno' ? 'Para aluno' : 'Para profissional'}</span>{paid && <span className="lp-plan-badge">Mais recursos</span>}</div>
    <h3>{name}</h3>
    <p className="lp-price">{money(plan.price_cents)}{paid && <small>/mês</small>}</p>
    <p className="lp-copy">{plan.description}</p>
    <ul className="lp-feature-list">{features.map(x => <li key={x}><span aria-hidden="true">✓</span>{x}</li>)}</ul>
    <a className={`lp-btn ${paid ? 'lp-btn-primary' : 'lp-btn-secondary'}`} href={paid ? signupHref(plan.audience, plan.id) : `${signupHref(plan.audience)}&inicio=gratis`}>{paid ? 'Escolher plano' : 'Começar grátis'}</a>
  </article>
}

export default function Landing() {
  const root = useRef(null)
  const user = useStore(s => s.user)
  const [audience, setAudience] = useState('aluno')
  const [plans, setPlans] = useState(null)
  const [error, setError] = useState('')
  const selected = AUDIENCE[audience]
  const visiblePlans = useMemo(() => (plans?.plans || []).filter(p => p.audience === audience), [plans, audience])

  useEffect(() => { api('/api/public/plans').then(setPlans).catch(e => setError(e.message || 'Não foi possível carregar os planos.')) }, [])
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let ctx
    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, s]) => {
      const gsap = g.default || g.gsap; const ScrollTrigger = s.ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)
      ctx = gsap.context(() => {
        gsap.from('[data-hero-copy]', { opacity: 0, y: 28, duration: .75, ease: 'power3.out' })
        gsap.from('[data-hero-media]', { opacity: 0, x: 34, duration: .9, delay: .12, ease: 'power3.out' })
        gsap.utils.toArray('[data-reveal]').forEach(el => gsap.from(el, { opacity: 0, y: 26, duration: .65, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } }))
        gsap.fromTo('[data-progress-line]', { scaleX: 0 }, { scaleX: 1, transformOrigin: 'left', ease: 'none', scrollTrigger: { trigger: '#como-funciona', start: 'top 75%', end: 'bottom 55%', scrub: .4 } })
      }, root)
    })
    return () => ctx?.revert()
  }, [])

  return <main ref={root} className="orny-landing" data-testid="landing">
    <header className="lp-header"><div className="lp-shell lp-header-inner">
      <a href="#top" aria-label="Início ORNY" className="lp-brand"><Brand /></a>
      <nav aria-label="Navegação principal" className="lp-nav"><a href="#beneficios">Benefícios</a><a href="#como-funciona">Como funciona</a><a href="#planos">Planos</a><a href="#duvidas">Dúvidas</a></nav>
      <a href={user ? '#/hoje' : '#/entrar'} className="lp-btn lp-btn-secondary lp-header-login">{user ? 'Abrir minha conta' : 'Entrar'}</a>
      </div>
    </header>

    <section id="top" className="lp-hero"><div className="lp-shell lp-hero-grid">
      <div data-hero-copy className="lp-hero-copy"><span className="lp-eyebrow">Seu progresso começa aqui</span><h1>Treino com direção. <em>Evolução visível.</em></h1><p className="lp-lead">A ORNY organiza seus treinos, acompanha sua rotina e aproxima aluno e profissional em um só lugar.</p><div className="lp-actions"><a href={signupHref('aluno')} className="lp-btn lp-btn-primary">Quero treinar <span aria-hidden="true">→</span></a><a href={signupHref('profissional')} className="lp-btn lp-btn-secondary">Sou profissional</a></div><div className="lp-trust"><span>✓ Comece pelo navegador</span><span>✓ Instalação opcional</span><span>✓ Seus dados ficam na sua conta</span></div></div>
      <div data-hero-media className="lp-hero-image"><img src="/landing/hero-orny.webp" alt="Personal orientando uma aluna durante o treino" /></div>
      </div>
    </section>

    <section id="beneficios" className="lp-section">
      <div className="lp-shell"><div data-reveal className="lp-section-heading"><span className="lp-eyebrow">Uma ORNY para cada objetivo</span><h2>Escolha como você quer evoluir</h2><p className="lp-copy">A experiência muda conforme sua rotina, sem perder a simplicidade.</p></div>
        <div className="lp-audience-switch" role="tablist" aria-label="Escolha seu perfil">{Object.entries(AUDIENCE).map(([key, item]) => <button key={key} role="tab" aria-selected={audience === key} onClick={() => setAudience(key)} className={audience === key ? 'active' : ''}>{item.label}</button>)}
        </div>
        <div data-reveal className="lp-audience-panel"><div className="lp-audience-copy"><span className="lp-eyebrow">{selected.label}</span><h3>{selected.title}</h3><p className="lp-copy">{selected.copy}</p><ul className="lp-benefits">{selected.benefits.map(x => <li key={x}><span aria-hidden="true">✓</span>{x}</li>)}</ul><a href={signupHref(audience)} className="lp-btn lp-btn-primary">Começar agora</a>
          </div>
          <div className="lp-audience-image"><img key={selected.image} src={selected.image} alt={audience === 'aluno' ? 'Pessoa seguindo seu treino com apoio da ORNY' : 'Personal acompanhando a evolução de uma aluna'} /></div>
        </div>
      </div>
    </section>

    <section id="como-funciona" className="lp-section">
      <div className="lp-shell lp-how"><div data-reveal className="lp-phone"><img src="/landing/app-orny.webp" alt="Visual do aplicativo ORNY no celular" loading="lazy" /></div><div data-reveal><span className="lp-eyebrow">Simples desde o primeiro acesso</span><h2>Escolha. Cadastre-se. Comece.</h2><div className="lp-steps">{[['01','Escolha seu perfil','A experiência se adapta para aluno ou profissional.'],['02','Crie sua conta','Informe seus dados e revise o plano escolhido.'],['03','Use no celular','A instalação é opcional e você pode começar pelo navegador.']].map(([n,t,c]) => <div key={n} className="lp-step"><b>{n}</b><div><h3>{t}</h3><p className="lp-copy">{c}</p></div></div>)}</div>
        </div>
      </div>
    </section>

    <section id="planos" className="lp-section lp:border-y lp:border-white/10 lp:bg-black/35">
      <div className="lp-shell"><div data-reveal className="lp-section-heading"><span className="lp-eyebrow">Planos claros</span><h2>Comece do seu jeito</h2><p className="lp-copy">Os preços e recursos abaixo vêm diretamente do catálogo atual da ORNY.</p></div>{plans?.test_mode && <p className="lp-status" role="status">Ambiente de teste: os pagamentos apresentados nesta versão não geram cobrança real.</p>}<div className="lp-plan-context">Perfil selecionado: <strong>{selected.label}</strong></div>{error ? <p className="lp-error" role="alert">{error}</p> : !plans ? <p className="lp-loading">Carregando planos…</p> : visiblePlans.length === 0 ? <p className="lp-empty">Nenhum plano disponível para este perfil no momento.</p> : <div data-reveal className="lp-plans">{visiblePlans.map(p => <PlanCard key={p.id} plan={p} />)}</div>}
      </div>
    </section>

    <section id="instalacao" className="lp-section lp-install"><div className="lp-shell"><div data-reveal className="lp-section-heading"><span className="lp-eyebrow">No seu celular</span><h2>Instale quando quiser. Use desde já.</h2><p className="lp-copy">A ORNY funciona normalmente no navegador. Adicionar à tela inicial é opcional e deixa o acesso mais rápido.</p></div><div className="lp-install-grid">{Object.entries(INSTALL_GUIDE).map(([key, guide]) => <article data-reveal className="lp-install-card" key={key}><div className="lp-install-icon" aria-hidden="true">{guide.icon}</div><span className="lp-eyebrow">{guide.eyebrow}</span><h3>{guide.title}</h3><p className="lp-copy">{guide.intro}</p><ol>{guide.steps.map((step, index) => <li key={step}><b>{index + 1}</b><span>{step}</span></li>)}</ol></article>)}</div><p className="lp-install-note"><strong>Notificações são opcionais.</strong> Você pode ativá-las depois, em Perfil → Configurações. Elas nunca bloqueiam seu acesso.</p></div></section>

    <section id="duvidas" className="lp-section lp:border-t lp:border-white/10"><div className="lp-shell lp:max-w-3xl"><div data-reveal className="lp:text-center"><span className="lp-kicker">Dúvidas frequentes</span><h2 className="lp:mt-4 lp:text-4xl lp:font-black">Antes de começar</h2></div><div className="lp-faq lp:mt-9 lp:grid lp:gap-3">{[
      ['Preciso instalar alguma coisa para usar?','Não. Você pode usar pelo navegador e, se quiser, adicionar a ORNY à tela inicial do celular depois do cadastro.'],
      ['Aluno e personal usam o mesmo sistema?','Sim. Cada perfil recebe navegação, recursos e planos adequados à sua rotina.'],
      ['Posso começar sem pagar?','Sim. Há opções gratuitas no catálogo para alunos e profissionais.'],
      ['Como funcionam as notificações?','Você escolhe se quer ativá-las. A ORNY explica antes de pedir a permissão do aparelho, e isso nunca bloqueia seu acesso.']
    ].map(([q,a]) => <details key={q} className="lp-card"><summary>{q}</summary><p>{a}</p></details>)}</div></div></section>

    <section className="lp:py-20"><div data-reveal className="lp-shell lp-card lp:overflow-hidden lp:p-8 lp:text-center md:lp:p-14"><span className="lp-kicker">Seu próximo passo</span><h2 className="lp:mx-auto lp:mt-4 lp:max-w-3xl lp:text-4xl lp:font-black lp:tracking-[-.04em] md:lp:text-5xl">Seu progresso pode começar agora.</h2><p className="lp-copy lp:mx-auto lp:mt-5 lp:max-w-xl">Escolha como você quer usar a ORNY e crie sua conta.</p><div className="lp:mt-8 lp:flex lp:flex-wrap lp:justify-center lp:gap-3"><a href={signupHref('aluno')} className="lp-btn lp-btn-primary">Quero treinar</a><a href={signupHref('profissional')} className="lp-btn lp-btn-ghost">Sou profissional</a></div></div></section>
    <footer className="lp:border-t lp:border-white/10 lp:py-8"><div className="lp-shell lp:flex lp:flex-wrap lp:items-center lp:justify-between lp:gap-4 lp:text-sm lp:text-[#a4aca5]"><div className="lp:w-24"><Brand /></div><div className="lp:flex lp:flex-wrap lp:gap-4"><a href="#/legal/termos">Termos de Uso</a><a href="#/legal/privacidade">Privacidade</a><a href="#/legal/assinatura">Assinatura</a><a href="#/entrar">Entrar</a></div><span>© {new Date().getFullYear()} ORNY</span></div></footer>
    <div className="lp-mobile-cta"><a href={signupHref(audience)} className="lp-btn lp-btn-primary">{audience === 'aluno' ? 'Começar a treinar' : 'Começar como profissional'}</a></div>
  </main>
}
