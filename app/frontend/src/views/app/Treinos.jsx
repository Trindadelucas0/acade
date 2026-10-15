// V4 · F1 — Treinos do aluno: Programas · Do meu profissional · Rotinas antigas (somente consulta).
// O aluno não monta treino (decisão do Lucas): só treina programa publicado ou ficha do profissional vinculado.
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { useStore } from '../../store/useStore.js'
import { G, minutesLabel } from '../../lib/guided.js'
import { C, P } from '../../lib/care.js'
import { PlanHistory } from '../v3/V42.jsx'
import { TREINO_TABS, defaultTab, validTab, normTab } from '../../lib/start.js'
import { glyphOf } from '../../lib/glyphs.js'
import { Tabs, Empty, Err } from './kit.jsx'
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
  const nav = useNavigate(), [sp, setSp] = useSearchParams()
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
  const tab = validTab(sp.get('aba')) ? normTab(sp.get('aba')) : ready ? defaultTab({ plans: plans.length }) : null
  const setTab = k => setSp({ aba: k }, { replace: true })
  const counts = { programas: a ? 1 : 0, profissionais: plans.length, historico: routines.length }

  return <div className="ag" data-testid="treinos">
    <span className="g-eyebrow">Treinos</span><h1 style={{ marginTop: 2 }}>Seus treinos</h1>
    <ResumeBar />
    <ActiveTrainingBanner at={at} compact onChange={() => setN(x => x + 1)} />
    {ready && (st === false || care === false) && <Err msg="Não foi possível carregar tudo. Verifique a conexão." retry={() => setN(x => x + 1)} />}
    {tab && <Tabs tabs={TREINO_TABS.map(([k, l]) => [k, l, counts[k] || 0])} cur={tab} set={setTab} />}
    {!tab ? <p className="g-mut g-sm" role="status">Carregando…</p> : <>
      {tab === 'historico' && <section data-testid="tab-historico">
        <p className="g-mut g-sm">Rotinas que você montou em versões anteriores. Ficam guardadas para consulta; para treinar, escolha um programa ou uma ficha do seu profissional.</p>
        {routines.length ? <div className="g-card g-list">{routines.map(r => <div key={r.id} className="g-li" data-testid="legacy-routine">
          <span className="g-ico"><Icon name={glyphOf(r.emoji)} /></span>
          <span style={{ minWidth: 0 }}><b>{r.name}</b><br /><span className="g-mut g-xs">{r.ex.length} exercício{r.ex.length === 1 ? '' : 's'} · somente consulta</span></span>
        </div>)}</div>
          : <Empty icon="folder">Nenhuma rotina antiga.</Empty>}
        <div className="g-card g-list" style={{ marginTop: 10 }}><Li icon="chart" t="Histórico de treinos antigos" s="Sessões de versões anteriores · somente consulta" to="/history" /></div>
      </section>}

      {tab === 'programas' && <section data-testid="tab-programas">
        <CoachLockNote />
        {!at?.locked_to_pro && <div className="g-card">
          {a ? <><span className="g-mut g-xs">Programa ativo</span><h3 style={{ marginTop: 4 }}>{a.title}</h3>
            <p className="g-mut g-sm">Semana {a.week_index} de {a.weeks} · {minutesLabel(a)}</p>
            <button className="g-btn" style={{ marginTop: 12 }} disabled={!!live && live.to !== '/treinar'} onClick={() => nav('/treinar')} data-testid="treinos-start"><Icon name={live?.to === '/treinar' ? 'play' : 'dumbbell'} /> {live?.to === '/treinar' ? 'Continuar treino' : 'Começar treino de hoje'}</button></>
            : <><h3>Nenhum programa ativo</h3><p className="g-mut g-sm">Escolha um programa publicado. Se responder às perguntas, mostramos os que combinam com você.</p>
              <button className="g-btn" style={{ marginTop: 12 }} onClick={() => nav(st?.profile ? '/recomendados' : '/onboarding')} data-testid="treinos-start">Escolher meu treino</button></>}
        </div>}
        <div className="g-card g-list" style={{ marginTop: 10 }}>
          {a && <Li icon="calendar" t="Meu programa" s="Treinos da semana e progresso" to="/meu-programa" />}
          {!at?.locked_to_pro && <Li icon="sparkles" t="Recomendados para você" s="Objetivo, nível, local, frequência, tempo e restrições" to="/recomendados" />}
          <Li icon="clipboard" t="Todos os programas" s={at?.locked_to_pro ? 'Somente consulta enquanto a ficha do profissional estiver ativa' : undefined} to="/programas" />
          {st?.profile && <Li icon="pencil" t="Refazer perguntas" to="/onboarding" />}
        </div>
      </section>}

      {tab === 'profissionais' && <section data-testid="tab-profissionais">
        {plans.length ? <div className="g-card g-list">{plans.map(p => <div key={p.id} className="g-li" style={{ display: 'block' }} data-testid="pro-plan">
          <div className="g-row" style={{ gap: 8 }}><b>{p.title}</b>{at?.kind === 'profissional' && at.pro_plan?.id === p.id && <span className="g-activebadge">Ativo</span>}</div><span className="g-mut g-xs">Responsável: {p.owner_name}{p.specialty ? ' · ' + p.specialty : ''} · {p.exercises.length} exercícios</span>
          {p.notes && <p className="g-sm g-mut" style={{ marginTop: 4 }}>{p.notes}</p>}
          {p.description && <p className="g-sm" style={{ marginTop: 4 }} data-testid="plan-description">{p.description}</p>}
          {p.days?.length > 1 ? <div className="g-row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>{p.days.map((d, i) => <button key={i} className="g-btn g-ghost g-sm" style={{ width: 'auto', padding: '0 14px' }} disabled={!!live} onClick={() => startPlan(p, `/treinar?plan=${p.id}&day=${i}`)} data-testid="plan-day">{d.name} · {d.exercises.length}</button>)}</div>
            : <button className="g-btn g-sm" style={{ marginTop: 8 }} disabled={!!live || (at?.kind === 'profissional' && at.pro_plan?.id !== p.id)} onClick={() => startPlan(p, '/treinar?plan=' + p.id)} data-testid="plan-start">{at?.kind === 'profissional' && at.pro_plan?.id === p.id ? 'Começar este treino' : at?.kind === 'sistema' ? 'Desvincular programa e aceitar' : 'Aceitar e começar'}</button>}</div>)}</div>
          : <NoPro />}
        <PlanHistory plans={care?.plan_history} />
      </section>}

      <h2>Explorar</h2>
      <div className="g-card g-list">
        <Li icon="list" t="Biblioteca de exercícios" s="Com fotos, animações e instruções" to="/library" />
        <Li icon="person" t="Corpo 3D" s="Toque no músculo e veja exercícios" to="/muscles" />
      </div>
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
