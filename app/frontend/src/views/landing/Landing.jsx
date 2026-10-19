import { useEffect, useMemo, useRef, useState } from 'react'
import Brand from '../../components/Brand.jsx'
import { api } from '../../lib/api.js'
import { useStore } from '../../store/useStore.js'
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
  return <article className={`lp-card lp:relative lp:flex lp:h-full lp:flex-col lp:p-6 ${paid ? 'lp-plan-popular' : ''}`} data-testid={`landing-plan-${plan.id}`}>
    {paid && <span className="lp:absolute lp:right-5 lp:top-5 lp:rounded-full lp:bg-[#20f51b] lp:px-3 lp:py-1 lp:text-[11px] lp:font-black lp:text-black">MAIS RECURSOS</span>}
    <span className="lp-kicker">{plan.audience === 'aluno' ? 'Para aluno' : 'Para profissional'}</span>
    <h3 className="lp:mt-3 lp:text-2xl lp:font-black">{name}</h3>
    <p className="lp:mt-4 lp:text-3xl lp:font-black lp:text-[#20f51b]">{money(plan.price_cents)}{paid && <small className="lp:text-sm lp:font-medium lp:text-[#a4aca5]">/mês</small>}</p>
    <p className="lp-copy lp:mt-4 lp:text-sm">{plan.description}</p>
    <ul className="lp:my-6 lp:grid lp:gap-3 lp:text-sm">{features.map(x => <li key={x} className="lp:flex lp:gap-2"><b className="lp:text-[#20f51b]">✓</b><span>{x}</span></li>)}</ul>
    <a className={`lp-btn lp:mt-auto ${paid ? 'lp-btn-primary' : 'lp-btn-ghost'}`} href={paid ? signupHref(plan.audience, plan.id) : `${signupHref(plan.audience)}&inicio=gratis`}>{paid ? 'Escolher plano' : 'Começar grátis'}</a>
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

  return <main ref={root} className="orny-landing lp-grid-bg" data-testid="landing">
    <header className="lp:sticky lp:top-0 lp:z-50 lp:border-b lp:border-white/10 lp:bg-black/85 lp:backdrop-blur-xl">
      <div className="lp-shell lp:flex lp:min-h-18 lp:items-center lp:justify-between lp:gap-5">
        <a href="#top" aria-label="Início ORNY" className="lp:block lp:w-32"><Brand /></a>
        <nav aria-label="Navegação principal" className="lp:hidden lp:items-center lp:gap-6 lp:text-sm lp:font-semibold md:lp:flex">
          <a href="#beneficios">Benefícios</a><a href="#como-funciona">Como funciona</a><a href="#planos">Planos</a><a href="#duvidas">Dúvidas</a>
        </nav>
        <a href={user ? '#/hoje' : '#/entrar'} className="lp-btn lp-btn-ghost lp:min-h-10 lp:px-5">{user ? 'Abrir minha conta' : 'Entrar'}</a>
      </div>
    </header>

    <section id="top" className="lp:relative lp:min-h-[760px] lp:overflow-hidden lp:border-b lp:border-white/10">
      <img data-hero-media src="/landing/hero-orny.webp" alt="Personal orientando uma aluna durante o treino" className="lp:absolute lp:inset-0 lp:h-full lp:w-full lp:object-cover lp:object-[68%_center]" />
      <div className="lp:absolute lp:inset-0 lp:bg-[linear-gradient(90deg,#050605_5%,rgba(5,6,5,.94)_36%,rgba(5,6,5,.26)_72%,rgba(5,6,5,.5))]" />
      <div className="lp-shell lp:relative lp:z-10 lp:flex lp:min-h-[760px] lp:items-center">
        <div data-hero-copy className="lp:max-w-2xl lp:py-24">
          <span className="lp-kicker">Seu progresso começa aqui</span>
          <h1 className="lp:mt-5 lp:text-balance lp:text-5xl lp:font-black lp:leading-[.98] lp:tracking-[-.055em] sm:lp:text-7xl">Seu treino.<br />Seus alunos.<br /><em className="lp:not-italic lp:text-[#20f51b]">Sua evolução.</em></h1>
          <p className="lp-copy lp:mt-7 lp:max-w-xl lp:text-lg">Uma plataforma para quem treina com propósito e para quem transforma acompanhamento em resultado.</p>
          <div className="lp:mt-8 lp:flex lp:flex-wrap lp:gap-3">
            <a href={signupHref('aluno')} className="lp-btn lp-btn-primary">Quero treinar <span aria-hidden="true">→</span></a>
            <a href={signupHref('profissional')} className="lp-btn lp-btn-ghost">Sou profissional</a>
          </div>
          <div className="lp:mt-8 lp:flex lp:flex-wrap lp:gap-x-6 lp:gap-y-2 lp:text-sm lp:text-[#c5cbc5]"><span>✓ Comece grátis</span><span>✓ Cancele quando quiser</span><span>✓ Seus dados permanecem salvos</span></div>
        </div>
      </div>
    </section>

    <section id="beneficios" className="lp-section">
      <div className="lp-shell">
        <div data-reveal className="lp:mx-auto lp:max-w-3xl lp:text-center"><span className="lp-kicker">Uma ORNY para cada objetivo</span><h2 className="lp:mt-4 lp:text-4xl lp:font-black lp:tracking-[-.04em] md:lp:text-5xl">Escolha como você quer evoluir</h2></div>
        <div className="lp:mx-auto lp:mt-10 lp:flex lp:w-fit lp:rounded-full lp:border lp:border-white/10 lp:bg-white/5 lp:p-1" role="tablist" aria-label="Público">
          {Object.entries(AUDIENCE).map(([key, item]) => <button key={key} role="tab" aria-selected={audience === key} onClick={() => setAudience(key)} className={`lp:min-h-11 lp:rounded-full lp:px-5 lp:text-sm lp:font-extrabold ${audience === key ? 'lp:bg-[#20f51b] lp:text-black' : 'lp:text-white'}`}>{item.label}</button>)}
        </div>
        <div data-reveal className="lp-card lp:mt-10 lp:grid lp:overflow-hidden md:lp:grid-cols-2">
          <div className="lp:flex lp:flex-col lp:justify-center lp:p-7 md:lp:p-12">
            <span className="lp-kicker">{selected.label}</span><h3 className="lp:mt-4 lp:text-3xl lp:font-black lp:tracking-[-.035em] md:lp:text-4xl">{selected.title}</h3><p className="lp-copy lp:mt-5">{selected.copy}</p>
            <ul className="lp:mt-7 lp:grid lp:gap-3 sm:lp:grid-cols-2">{selected.benefits.map(x => <li key={x} className="lp:flex lp:gap-2 lp:text-sm"><b className="lp:text-[#20f51b]">✓</b>{x}</li>)}</ul>
            <a href={signupHref(audience)} className="lp-btn lp-btn-primary lp:mt-8 lp:self-start">Começar agora</a>
          </div>
          <div className="lp-media lp:min-h-[360px]"><img key={selected.image} src={selected.image} alt={audience === 'aluno' ? 'Pessoa seguindo seu treino com apoio da ORNY' : 'Personal acompanhando a evolução de uma aluna'} /></div>
        </div>
      </div>
    </section>

    <div className="lp-progress-line" data-progress-line />
    <section id="como-funciona" className="lp-section">
      <div className="lp-shell lp:grid lp:items-center lp:gap-12 md:lp:grid-cols-[.8fr_1.2fr]">
        <div data-reveal className="lp-media lp:mx-auto lp:max-w-[390px] lp:rounded-[34px]"><img src="/landing/app-orny.webp" alt="Visual do aplicativo ORNY no celular" loading="lazy" /></div>
        <div data-reveal><span className="lp-kicker">Simples desde o primeiro acesso</span><h2 className="lp:mt-4 lp:text-4xl lp:font-black lp:tracking-[-.04em]">Escolha. Cadastre-se. Comece.</h2>
          <div className="lp:mt-9 lp:grid lp:gap-5">{[['01','Escolha seu perfil','A experiência se adapta para aluno ou profissional.'],['02','Crie sua conta','Informe seus dados e revise o plano escolhido.'],['03','Use no celular','Adicione a ORNY à tela inicial e receba seus avisos.']].map(([n,t,c]) => <div key={n} className="lp-card lp:flex lp:gap-5 lp:p-5"><b className="lp:text-2xl lp:text-[#20f51b]">{n}</b><div><h3 className="lp:text-lg lp:font-black">{t}</h3><p className="lp-copy lp:mt-1 lp:text-sm">{c}</p></div></div>)}</div>
        </div>
      </div>
    </section>

    <section id="planos" className="lp-section lp:border-y lp:border-white/10 lp:bg-black/35">
      <div className="lp-shell"><div data-reveal className="lp:text-center"><span className="lp-kicker">Planos claros</span><h2 className="lp:mt-4 lp:text-4xl lp:font-black lp:tracking-[-.04em]">Comece do seu jeito</h2><p className="lp-copy lp:mx-auto lp:mt-4 lp:max-w-2xl">Os preços e recursos abaixo vêm diretamente do catálogo atual da ORNY.</p></div>
        {plans?.test_mode && <p className="lp:mx-auto lp:mt-7 lp:max-w-3xl lp:rounded-2xl lp:border lp:border-amber-400/30 lp:bg-amber-400/10 lp:p-4 lp:text-center lp:text-sm lp:text-amber-100" role="status">Ambiente de teste: os pagamentos apresentados nesta versão não geram cobrança real.</p>}
        <div className="lp:mx-auto lp:mt-8 lp:flex lp:w-fit lp:rounded-full lp:border lp:border-white/10 lp:bg-white/5 lp:p-1">{Object.entries(AUDIENCE).map(([key,item]) => <button key={key} onClick={() => setAudience(key)} className={`lp:min-h-11 lp:rounded-full lp:px-5 lp:text-sm lp:font-extrabold ${audience===key?'lp:bg-white lp:text-black':'lp:text-white'}`}>{item.label}</button>)}</div>
        {error ? <p className="lp:mt-8 lp:text-center lp:text-red-300" role="alert">{error}</p> : !plans ? <p className="lp:mt-8 lp:text-center lp:text-[#a4aca5]">Carregando planos…</p> : <div data-reveal className="lp:mx-auto lp:mt-10 lp:grid lp:max-w-4xl lp:gap-5 md:lp:grid-cols-2">{visiblePlans.map(p => <PlanCard key={p.id} plan={p} />)}</div>}
      </div>
    </section>

    <section className="lp-section"><div className="lp-shell"><div data-reveal className="lp:mx-auto lp:max-w-3xl lp:text-center"><span className="lp-kicker">No seu celular</span><h2 className="lp:mt-4 lp:text-4xl lp:font-black lp:tracking-[-.04em]">A ORNY sempre ao alcance</h2><p className="lp-copy lp:mt-5">Depois do cadastro, identificamos seu aparelho e mostramos somente o procedimento verdadeiro para ele. Você decide quando adicionar à tela inicial e quando ativar notificações.</p></div>
      <div className="lp:mt-10 lp:grid lp:gap-5 md:lp:grid-cols-2">
        <article data-reveal className="lp-card lp:p-6 md:lp:p-8" aria-labelledby="android-install-title"><div className="lp:flex lp:items-center lp:gap-4"><span className="lp:grid lp:h-12 lp:w-12 lp:place-items-center lp:rounded-2xl lp:bg-[#20f51b] lp:text-2xl lp:font-black lp:text-black" aria-hidden="true">⋮</span><div><span className="lp-kicker">Android · Chrome</span><h3 id="android-install-title" className="lp:mt-1 lp:text-2xl lp:font-black">Adicionar à tela inicial</h3></div></div><ol className="lp:mt-7 lp:grid lp:gap-4">{['Abra a ORNY no Chrome.','Toque no menu ⋮, no canto superior do navegador.','Escolha “Instalar app” ou “Adicionar à tela inicial”.','Confirme em “Instalar” ou “Adicionar”.'].map((x,i)=><li key={x} className="lp:flex lp:gap-3"><b className="lp:grid lp:h-7 lp:w-7 lp:shrink-0 lp:place-items-center lp:rounded-full lp:bg-white/10 lp:text-sm lp:text-[#20f51b]">{i+1}</b><span className="lp-copy lp:text-sm">{x}</span></li>)}</ol></article>
        <article data-reveal className="lp-card lp:p-6 md:lp:p-8" aria-labelledby="iphone-install-title"><div className="lp:flex lp:items-center lp:gap-4"><span className="lp:grid lp:h-12 lp:w-12 lp:place-items-center lp:rounded-2xl lp:bg-white lp:text-2xl lp:font-black lp:text-black" aria-hidden="true">⇧</span><div><span className="lp-kicker">iPhone · Safari</span><h3 id="iphone-install-title" className="lp:mt-1 lp:text-2xl lp:font-black">Adicionar à Tela de Início</h3></div></div><ol className="lp:mt-7 lp:grid lp:gap-4">{['Abra a ORNY no Safari.','Toque no botão Compartilhar (quadrado com seta para cima).','Role as opções e toque em “Adicionar à Tela de Início”.','Confira o nome ORNY e toque em “Adicionar”.'].map((x,i)=><li key={x} className="lp:flex lp:gap-3"><b className="lp:grid lp:h-7 lp:w-7 lp:shrink-0 lp:place-items-center lp:rounded-full lp:bg-white/10 lp:text-sm lp:text-[#20f51b]">{i+1}</b><span className="lp-copy lp:text-sm">{x}</span></li>)}</ol></article>
      </div></div></section>

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
