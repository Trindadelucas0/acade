// V3 · F6 — Meus treinos do aluno gratuito: Minhas rotinas · Programas guiados · Dos meus profissionais,
// com "Criar meu treino" e "Retomar treino". Fichas: só ativas de vínculos ativos, versão mais recente.
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { useStore } from '../../store/useStore.js'
import { G, minutesLabel } from '../../lib/guided.js'
import { C, P } from '../../lib/care.js'
import { TREINO_TABS, defaultTab, validTab } from '../../lib/start.js'
import { startFlow } from '../../sheets.jsx'
import { glyphOf } from '../../lib/glyphs.js'
import { Tabs, Empty } from './kit.jsx'
import { ResumeBar, CreateWorkoutSheet, useLive } from '../v3/StartHub.jsx'
import '../guided/guided.css'
const NO_ROUTINES = []

export const Li = ({ icon, t, s, to, onClick, testid, badge }) => { const nav = useNavigate()
  return <button className="g-li" onClick={onClick || (() => nav(to))} data-testid={testid}>
    <span className="g-ico"><Icon name={icon} /></span><span style={{ minWidth: 0 }}><b>{t}</b>{s && <><br /><span className="g-mut g-xs">{s}</span></>}</span>
    {badge ? <span className="g-badge">{badge}</span> : null}<span className="g-chev"><Icon name="play" /></span></button> }

export default function Treinos() {
  const nav = useNavigate(), [sp, setSp] = useSearchParams()
  const routines = useStore(s => s.S?.routines || NO_ROUTINES)
  const live = useLive()
  const [st, setSt] = useState(null), [care, setCare] = useState(null), [create, setCreate] = useState(sp.get('criar') === '1')
  useEffect(() => { G.state().then(setSt).catch(() => setSt(false)); C.care().then(setCare).catch(() => setCare(false)) }, [])
  const plans = care?.plans || [], a = st && st.active
  const ready = st !== null && care !== null
  const tab = validTab(sp.get('aba')) ? sp.get('aba') : ready ? defaultTab({ plans: plans.length, active: !!a, routines: routines.length }) : null
  const setTab = k => setSp({ aba: k }, { replace: true })
  const closeCreate = () => { setCreate(false); if (sp.get('criar')) { sp.delete('criar'); setSp(sp, { replace: true }) } }
  const counts = { rotinas: routines.length, programas: a ? 1 : 0, profissionais: plans.length }

  return <div className="ag" data-testid="treinos">
    <div className="g-row"><div><span className="g-eyebrow">Treinos</span><h1 style={{ marginTop: 2 }}>Meus treinos</h1></div><span className="g-sp" />
      <button className="g-btn g-sm" style={{ width: 'auto', padding: '0 14px' }} onClick={() => setCreate(true)} data-testid="create-open"><Icon name="plus" /> Criar meu treino</button></div>
    <ResumeBar />
    {tab && <Tabs tabs={TREINO_TABS.map(([k, l]) => [k, l, counts[k] || 0])} cur={tab} set={setTab} />}
    {!tab ? <p className="g-mut g-sm">Carregando…</p> : <>
      {tab === 'rotinas' && <section data-testid="tab-rotinas">
        {routines.length ? <div className="g-card g-list">{routines.map(r => <div key={r.id} className="g-li">
          <span className="g-ico"><Icon name={glyphOf(r.emoji)} /></span>
          <button className="g-li-main" onClick={() => nav('/plan/r/' + r.id)} data-testid="routine-edit"><b>{r.name}</b><br /><span className="g-mut g-xs">{r.ex.length ? r.ex.length + ' exercício' + (r.ex.length > 1 ? 's' : '') : 'Sem exercícios — toque para montar'}</span></button>
          <button className="g-btn g-sm" style={{ width: 'auto', padding: '0 14px' }} disabled={!r.ex.length || !!live} onClick={() => startFlow(r.id)} data-testid="routine-start" aria-label={'Iniciar ' + r.name}><Icon name="play" /> Iniciar</button>
        </div>)}</div>
          : <Empty icon="folder">Você ainda não tem rotinas. Monte a sua do zero ou comece por um plano pronto.</Empty>}
        <div className="g-actions" style={{ marginTop: 10 }}>
          <button className="g-btn g-ghost g-sm" onClick={() => setCreate(true)}>Nova rotina</button>
          <button className="g-btn g-ghost g-sm" onClick={() => nav('/plan')}>Semana e agenda</button></div>
      </section>}

      {tab === 'programas' && <section data-testid="tab-programas">
        <div className="g-card">
          {a ? <><span className="g-mut g-xs">Programa ativo</span><h3 style={{ marginTop: 4 }}>{a.title}</h3>
            <p className="g-mut g-sm">Semana {a.week_index} de {a.weeks} · {minutesLabel(a)}</p>
            <button className="g-btn" style={{ marginTop: 12 }} disabled={!!live && live.to !== '/treinar'} onClick={() => nav('/treinar')} data-testid="treinos-start"><Icon name={live?.to === '/treinar' ? 'play' : 'dumbbell'} /> {live?.to === '/treinar' ? 'Continuar treino' : 'Começar treino de hoje'}</button></>
            : <><h3>Nenhum programa ativo</h3><p className="g-mut g-sm">Responda 6 perguntas e receba programas que combinam com seu objetivo, nível e tempo.</p>
              <button className="g-btn" style={{ marginTop: 12 }} onClick={() => nav(st?.profile ? '/recomendados' : '/onboarding')} data-testid="treinos-start">{st?.profile ? 'Ver programas para mim' : 'Responder perguntas'}</button></>}
        </div>
        <div className="g-card g-list" style={{ marginTop: 10 }}>
          {a && <Li icon="calendar" t="Meu programa" s="Treinos da semana e progresso" to="/meu-programa" />}
          <Li icon="sparkles" t="Recomendados para você" s="Objetivo, nível, local, frequência, tempo e restrições" to="/recomendados" />
          <Li icon="clipboard" t="Todos os programas" to="/programas" />
          {st?.profile && <Li icon="pencil" t="Refazer perguntas" to="/onboarding" />}
        </div>
      </section>}

      {tab === 'profissionais' && <section data-testid="tab-profissionais">
        {plans.length ? <div className="g-card g-list">{plans.map(p => <div key={p.id} className="g-li" style={{ display: 'block' }} data-testid="pro-plan">
          <b>{p.title}</b><br /><span className="g-mut g-xs">Responsável: {p.owner_name}{p.specialty ? ' · ' + p.specialty : ''} · {p.exercises.length} exercícios</span>
          {p.notes && <p className="g-sm g-mut" style={{ marginTop: 4 }}>{p.notes}</p>}
          {p.description && <p className="g-sm" style={{ marginTop: 4 }} data-testid="plan-description">{p.description}</p>}
          {p.days?.length > 1 ? <div className="g-row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>{p.days.map((d, i) => <button key={i} className="g-btn g-sm" style={{ width: 'auto', padding: '0 14px' }} disabled={!!live} onClick={() => nav(`/treinar?plan=${p.id}&day=${i}`)} data-testid="plan-day">{d.name} · {d.exercises.length}</button>)}</div>
            : <button className="g-btn g-sm" style={{ marginTop: 8 }} disabled={!!live} onClick={() => nav('/treinar?plan=' + p.id)}>Começar este treino</button>}</div>)}</div>
          : <NoPro />}
      </section>}

      <h2>Explorar</h2>
      <div className="g-card g-list">
        <Li icon="list" t="Biblioteca de exercícios" s="Com fotos, animações e instruções" to="/library" />
        <Li icon="person" t="Corpo 3D" s="Toque no músculo e veja exercícios" to="/muscles" />
      </div>
    </>}
    {create && <CreateWorkoutSheet onClose={closeCreate} />}
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
