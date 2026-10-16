// V4 · F1 — Treinos do aluno: Programas · Do meu profissional · Rotinas antigas (somente consulta).
// O aluno não monta treino (decisão do Lucas): só treina programa publicado ou ficha do profissional vinculado.
import { useNavigationAccess } from '../../components/NavigationAccess.jsx'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { useStore } from '../../store/useStore.js'
import { G, minutesLabel } from '../../lib/guided.js'
import { C, P } from '../../lib/care.js'
import { PlanHistory } from '../v3/V42.jsx'
import { validTab, normTab } from '../../lib/start.js'
import { glyphOf } from '../../lib/glyphs.js'
import { Empty, Err } from './kit.jsx'
import { ResumeBar, useLive } from '../v3/StartHub.jsx'
import '../guided/guided.css'
import ActiveTrainingBanner, { detachSystem, CoachLockNote } from '../../components/ActiveTraining.jsx'
import { AT } from '../../lib/active.js'
import { ask, notifyError } from '../../lib/dialog.js'
const NO_ROUTINES = []

export const Li = ({ icon, t, s, to, onClick, testid, badge }) => { const nav = useNavigate()
  return <button className="g-li" onClick={onClick || (() => nav(to))} data-testid={testid}>
    <span className="g-ico"><Icon name={icon} /></span><span style={{ minWidth: 0 }}><b>{t}</b>{s && <><br /><span className="g-mut g-xs">{s}</span></>}</span>
    {badge ? <span className="g-badge">{badge}</span> : null}<span className="g-chev" aria-hidden="true"><Icon name="play" /></span></button> }

export default function Treinos() {
  const nav = useNavigate(), [sp, setSp] = useSearchParams(), can = useNavigationAccess()
  const routines = useStore(s => s.S?.routines || NO_ROUTINES)
  const live = useLive()
  const [st, setSt] = useState(null), [care, setCare] = useState(null), [n, setN] = useState(0), [at, setAt] = useState(null)
  useEffect(() => { AT.get().then(setAt).catch(() => {}) }, [n])
  // V4.1: ficha não ativa → confirma e ativa (o programa do sistema fica pausado, sem apagar), depois inicia
  const startPlan = async (p, url) => {
    if (at?.kind === 'profissional' && at.pro_plan?.id === p.id) return nav(url)
    if (at?.kind === 'profissional') return notifyError({ message: 'Você já tem uma ficha ativa. Só o seu profissional pode trocá-la.' })
    if (at?.kind === 'sistema') { const r = await detachSystem(at); if (!r) return }   // regra: desvincular antes de aceitar
    else if (!await ask('Aceitar esta ficha?', { text: 'Ela passa a ser seu único treino ativo. Programas avulsos do sistema ficam bloqueados enquanto ela estiver ativa.', ok: 'Aceitar e começar', cancel: 'Agora não' })) return
    try { await AT.activatePlan(p.id); nav(url) } catch (e) { notifyError(e) }
  }

  useEffect(() => { setSt(null); setCare(null); G.state().then(setSt).catch(() => setSt(false)); C.care().then(setCare).catch(() => setCare(false)) }, [n])
  const plans = care?.plans || [], a = st && st.active
  const ready = st !== null && care !== null
  const isClient = !!useStore.getState().user?.client_locked   // V4.2: aluno do personal não usa programas do sistema
  const tab0 = validTab(sp.get('aba')) ? normTab(sp.get('aba')) : ready ? 'ativo' : null
  const tab = isClient && tab0 === 'programas' ? 'profissionais' : tab0

  return <div className="ag" data-testid="treinos">
    <span className="g-eyebrow">Treinos</span><h1 style={{ marginTop: 2 }}>Seus treinos</h1>
    <ResumeBar />
    <ActiveTrainingBanner at={at} compact onChange={() => setN(x => x + 1)} />
    {tab !== 'ativo' && tab && <button className="g-link org-back" onClick={() => setSp({})}>← Treino ativo</button>}
    {ready && (st === false || care === false) && <Err msg="Não foi possível carregar tudo. Verifique a conexão." retry={() => setN(x => x + 1)} />}

    {!tab ? <p className="g-mut g-sm" role="status">Carregando…</p> : <>
      {(tab === 'ativo' || tab === 'programas') && !isClient && <section data-testid="tab-programas">
        <CoachLockNote />
        {!at?.locked_to_pro && (a || can('programas')) && <div className="g-card">
          {a ? <><span className="g-mut g-xs">Programa ativo</span><h3 style={{ marginTop: 4 }}>{a.title}</h3>
            <p className="g-mut g-sm">Semana {a.week_index} de {a.weeks} · {minutesLabel(a)}</p>
            <button className="g-btn" style={{ marginTop: 12 }} disabled={!!live && live.to !== '/treinar'} onClick={() => nav('/treinar')} data-testid="treinos-start"><Icon name={live?.to === '/treinar' ? 'play' : 'dumbbell'} /> {live?.to === '/treinar' ? 'Continuar treino' : 'Começar treino de hoje'}</button></>
            : <><h3>Nenhum programa ativo</h3><p className="g-mut g-sm">Escolha um programa publicado. Se responder às perguntas, mostramos os que combinam com você.</p>
              <button className="g-btn" style={{ marginTop: 12 }} onClick={() => nav(st?.profile ? '/recomendados' : '/onboarding')} data-testid="treinos-start">Escolher meu treino</button></>}
        </div>}
        {a && <div className="g-card g-list org-list"><Li icon="calendar" t="Ver ficha do programa" s="Dias de treino e exercícios" to="/meu-programa" /></div>}
      </section>}

      {(tab === 'ativo' || tab === 'profissionais') && <section data-testid="tab-profissionais">
        {plans.length ? <div className="g-card g-list">{plans.map(p => <div key={p.id} className="g-li" style={{ display: 'block' }} data-testid="pro-plan">
          <div className="g-row" style={{ gap: 8 }}><b>{p.title}</b>{at?.kind === 'profissional' && at.pro_plan?.id === p.id && <span className="g-activebadge">Ativo</span>}</div><span className="g-mut g-xs">Responsável: {p.owner_name}{p.specialty ? ' · ' + p.specialty : ''} · {p.exercises.length} exercícios</span>
          {p.notes && <p className="g-sm g-mut" style={{ marginTop: 4 }}>{p.notes}</p>}
          {p.description && <p className="g-sm" style={{ marginTop: 4 }} data-testid="plan-description">{p.description}</p>}
          {p.days?.length > 1 ? <div className="g-row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>{p.days.map((d, i) => <button key={i} className="g-btn g-ghost g-sm" style={{ width: 'auto', padding: '0 14px' }} disabled={!!live} onClick={() => startPlan(p, `/treinar?plan=${p.id}&day=${i}`)} data-testid="plan-day">{d.name} · {d.exercises.length}</button>)}</div>
            : <button className="g-btn g-sm" style={{ marginTop: 8 }} disabled={!!live || (at?.kind === 'profissional' && at.pro_plan?.id !== p.id)} onClick={() => startPlan(p, '/treinar?plan=' + p.id)} data-testid="plan-start">{at?.kind === 'profissional' && at.pro_plan?.id === p.id ? 'Começar este treino' : at?.kind === 'sistema' ? 'Desvincular programa e aceitar' : 'Aceitar e começar'}</button>}</div>)}</div>
          : !isClient && !a ? <NoPro /> : null}

      </section>}

      <details className="org-details"><summary>Fichas anteriores</summary>{care?.plan_history?.length ? <PlanHistory plans={care.plan_history} /> : <p className="g-mut g-sm">Nenhuma ficha anterior.</p>}</details>
      <details className="org-details" open={tab === 'historico' ? true : undefined} key={tab === 'historico' ? 'legacy' : 'closed'}><summary>Rotinas antigas — consulta</summary>
      {<section data-testid="tab-historico">
        <p className="g-mut g-sm">Rotinas que você montou em versões anteriores. Ficam guardadas para consulta; para treinar, escolha um programa ou uma ficha do seu profissional.</p>
        {routines.length ? <div className="g-card g-list">{routines.map(r => <div key={r.id} className="g-li" data-testid="legacy-routine">
          <span className="g-ico"><Icon name={glyphOf(r.emoji)} /></span>
          <span style={{ minWidth: 0 }}><b>{r.name}</b><br /><span className="g-mut g-xs">{r.ex.length} exercício{r.ex.length === 1 ? '' : 's'} · somente consulta</span></span>
        </div>)}</div>
          : <Empty icon="folder">Nenhuma rotina antiga.</Empty>}
        <div className="g-card g-list" style={{ marginTop: 10 }}><Li icon="chart" t="Histórico de treinos antigos" s="Sessões de versões anteriores · somente consulta" to="/history" /></div>
      </section>}

      </details>
      {can('programas') && <details className="org-details"><summary>Explorar programas</summary><div className="g-card g-list"><Li icon="sparkles" t="Recomendados para você" to="/recomendados" /><Li icon="clipboard" t="Todos os programas" to="/programas" /></div></details>}
      {can('biblioteca') && <div className="g-card g-list org-list"><Li icon="list" t="Biblioteca de exercícios" s="Fotos, animações e instruções" to="/library" /></div>}
    </>}
  </div>
}

// sem profissional: o aluno compartilha o código dele ou digita um convite
function NoPro() {
  const nav = useNavigate(), [code, setCode] = useState(''), [mine, setMine] = useState('')
  useEffect(() => { P.myCode().then(r => setMine(r.code)).catch(() => {}) }, [])
  const c = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return <div className="g-card" data-testid="no-pro">
    <h3 style={{ marginTop: 0 }}>Treine com um profissional</h3>
    <p className="g-mut g-sm">Quando um profissional verificado te convidar e você aceitar, as fichas dele aparecem aqui. Você decide — sem passar pela administração.</p>
    {mine && <p className="g-sm" style={{ marginTop: 10 }}>Seu código de aluno: <b style={{ letterSpacing: '.12em' }} data-testid="no-pro-code">{mine}</b> <span className="g-mut g-xs">· envie ao seu profissional</span></p>}
    <div className="g-row" style={{ gap: 8, marginTop: 10 }}>
      <input className="g-in" style={{ flex: 1 }} placeholder="Tenho um código de convite" value={code} maxLength={12} onChange={e => setCode(e.target.value.toUpperCase())} aria-label="Código de convite" data-testid="no-pro-invite" />
      <button className="g-btn g-sm" style={{ width: 'auto', padding: '0 16px' }} disabled={c.length < 6} onClick={() => nav('/convite/' + c)}>Abrir</button></div>
  </div>
}
