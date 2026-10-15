import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { useStore } from '../../store/useStore.js'
import { G, loadSession, flushQueue, pendingCount, rejectedCount, mediaOf, minutesLabel } from '../../lib/guided.js'
import { Spin } from './Programs.jsx'
import MuscleStatus from './MuscleStatus.jsx'
import { PendingCard, isPending } from '../app/Locked.jsx'
import { AvisosCard } from '../app/Avisos.jsx'
import { RankingCard } from '../app/Ranking.jsx'
import { C } from '../../lib/care.js'
import { Li } from '../app/Treinos.jsx'
import { ResumeBar } from '../v3/StartHub.jsx'
import './guided.css'
const NO_ROUTINES = []

const DN = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
export function WeekStrip({ sessions }) {
  const now = new Date(), mon = new Date(now); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))
  const done = new Set((sessions || []).map(s => new Date(s.started_at).toDateString()))
  return <div className="g-week">{DN.map((l, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i)
    const isT = d.toDateString() === now.toDateString(), isD = done.has(d.toDateString())
    return <div key={i} className={'g-d' + (isD ? ' g-done' : '') + (isT ? ' g-today' : '')}><i>{isD ? '✓' : d.getDate()}</i>{l}</div>
  })}</div>
}

export default function Today() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const [st, setSt] = useState(null), [today, setToday] = useState(null), [err, setErr] = useState(''), [pend, setPend] = useState(pendingCount())
  const local = loadSession()
  useEffect(() => {
    flushQueue().then(setPend).catch(() => {})
    G.state().then(s => {
      if (!s.profile && !s.onboarding_skipped) return nav('/onboarding', { replace: true })
      setSt(s)
      if (s.active) G.today().then(setToday).catch(() => {})
    }).catch(e => setErr(e.status === 401 ? 'Entre com sua conta para usar os programas guiados.' : 'Sem conexão. Você ainda pode continuar um treino salvo no aparelho.'))
  }, [nav])
  if (isPending(user)) return <div className="ag" data-testid="today"><span className="g-eyebrow">Início</span><h1>Olá{user.name ? ', ' + user.name.split(' ')[0] : ''}!</h1><div style={{ marginTop: 14 }}><PendingCard /></div></div>
  if (err) return <div className="ag"><h1>Hoje</h1><p className="g-mut">{err}</p>
    {local && <button className="g-btn g-xl" style={{ marginTop: 20 }} onClick={() => nav('/treinar')}>CONTINUAR TREINO</button>}</div>
  if (!st) return <Spin />
  const first = (user?.name || '').split(' ')[0]
  const w = today?.workout
  const cover = w && mediaOf(w.exercises.find(e => e.media)?.media)
  const estMin = w ? Math.round(w.exercises.reduce((a, e) => a + (e.sets || 3) * (((e.duration_sec || 40)) + (e.rest_sec || 60)), 0) / 60) : 0
  return <div className="ag" data-testid="today">
    <div className="g-row">
      <div><span className="g-mut g-sm">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
        <h1 style={{ marginTop: 2 }}>Olá{first ? ', ' + first : ''}!</h1></div>
      <span className="g-sp" />
      {st.streak_weeks > 0 && <span className="g-ring" title="Semanas seguidas treinando"><Icon name="flame" /> {st.streak_weeks} sem.</span>}
    </div>
    <AvisosCard />
    {pend > 0 && <p className="g-note" style={{ margin: '8px 0' }} data-testid="pending-sync">{rejectedCount() > 0 ? `${rejectedCount()} registro(s) recusado(s) pelo servidor ficam guardados no aparelho (nada é apagado). ` : ''}{pend - rejectedCount() > 0 ? `${pend - rejectedCount()} registro(s) aguardando conexão para sincronizar.` : ''}</p>}

    {!st.active ? <><ResumeBar /><StartHere profile={!!st.profile} /></> : <>
      <div className="g-hero" style={{ marginTop: 14 }} data-testid="today-card">
        {cover && <img src={cover.img} alt="" />}
        <div className="g-in">
          <span className="g-eyebrow">Treino de hoje</span>
          <h2 style={{ margin: '6px 0 4px' }}>{w ? w.name : 'Carregando…'}</h2>
          {w && <p className="g-mut g-sm">{w.exercises.length} exercícios · ~{estMin} min</p>}
          <p className="g-dim g-xs" style={{ marginTop: 6 }}>{st.active.title}</p>
        </div>
      </div>
      <button className="g-btn g-xl" style={{ marginTop: 14 }} disabled={!w && !local} onClick={() => nav('/treinar')} data-testid="start-workout">
        <Icon name={local ? 'play' : 'dumbbell'} /> {local ? 'CONTINUAR TREINO' : 'COMEÇAR TREINO'}
      </button>
      {w && <div className="g-card" style={{ marginTop: 14 }}>
        <div className="g-row"><b>O que vem hoje</b><span className="g-sp" /><button className="g-link" onClick={() => nav('/meu-programa')}>Meu programa</button></div>
        {w.exercises.slice(0, 4).map(e => <div key={e.id} className="g-row g-sm" style={{ padding: '6px 0' }}><span className="g-acc">•</span>{e.name}<span className="g-sp" /><span className="g-dim">{e.sets}x</span></div>)}
        {w.exercises.length > 4 && <p className="g-dim g-xs">+ {w.exercises.length - 4} exercícios</p>}
      </div>}
    </>}

    <div className="av-hero" style={{ marginTop: 14 }} data-testid="week-ring">
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div className="av-ring"><svg width="132" height="132"><circle cx="66" cy="66" r="56" stroke="#ffffff14" strokeWidth="12" fill="none" />
          <circle cx="66" cy="66" r="56" stroke="var(--ag-acc)" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 56 * Math.min(1, st.week.done / Math.max(1, st.week.target))} 999`} /></svg>
          <b>{st.week.done}/{st.week.target}<small>treinos na semana</small></b></div>
        <div style={{ minWidth: 0 }}><b>Sua semana</b><p className="g-mut g-xs" style={{ margin: '4px 0 0' }}>{st.week.done >= st.week.target ? 'Meta da semana cumprida!' : `Faltam ${Math.max(0, st.week.target - st.week.done)} treino(s) para a meta.`}</p></div>
      </div>
      <WeekStrip sessions={st.week.sessions} />
    </div>
    <div className="av-quick" data-testid="quick-actions">
      <button onClick={() => nav('/treinos')}><Icon name="dumbbell" />Treinos</button>
      <button onClick={() => nav('/progresso')}><Icon name="chart" />Progresso</button>
      <button onClick={() => nav('/muscles')}><Icon name="person" />Corpo 3D</button>
      <button onClick={() => nav('/acompanhamento')}><Icon name="chat" />Profissional</button>
    </div>
    <div className="g-card g-list" style={{ marginTop: 14 }}>
      <button className="g-li" onClick={() => nav('/acompanhamento')} data-testid="home-care"><span className="g-ico"><Icon name="chat" /></span><span><b>Acompanhamento</b><br /><span className="g-mut g-xs">Profissionais, dúvidas, ocorrências e orientações</span></span></button>
      <button className="g-li" onClick={() => nav('/comunidade')}><span className="g-ico"><Icon name="users" /></span><span><b>Comunidade</b><br /><span className="g-mut g-xs">Veja as novas publicações dos profissionais</span></span></button>
    </div>
    {user?.roles?.includes('aluno') && <RankingCard />}
    <div style={{ marginTop: 14 }}><MuscleStatus compact /></div>
    {st.active && <p className="g-dim g-xs g-center" style={{ marginTop: 14 }}>Semana {st.active.week_index} de {st.active.weeks} · {minutesLabel(st.active)} por treino</p>}
  </div>
}

// V3 · F6 — Início do aluno gratuito sem programa ativo: ficha do profissional (se houver) ou caminhos para começar
function StartHere({ profile }) {
  const nav = useNavigate(), [plans, setPlans] = useState(null), routines = useStore(s => s.S?.routines || NO_ROUTINES)
  useEffect(() => { C.care().then(r => setPlans(r.plans || [])).catch(() => setPlans([])) }, [])
  const p = plans?.[0], multi = p?.days?.length > 1
  return <section data-testid="start-here" style={{ marginTop: 14 }}>
    {p ? <div className="g-hero" data-testid="start-pro-card"><div className="g-in" style={{ maxWidth: '100%' }}>
      <span className="g-eyebrow">Ficha do seu profissional</span>
      <h2 style={{ margin: '6px 0 4px' }}>{p.title}</h2>
      <p className="g-mut g-sm">{p.owner_name} · {p.exercises.length} exercícios{multi ? ' · ' + p.days.length + ' dias' : ''}</p>
      <button className="g-btn" style={{ marginTop: 12 }} onClick={() => nav(multi ? '/treinos?aba=profissionais' : '/treinar?plan=' + p.id)} data-testid="start-pro-plan"><Icon name="dumbbell" /> {multi ? 'Escolher o treino do dia' : 'Começar treino'}</button>
    </div></div>
      : <div className="g-hero"><div className="g-in" style={{ maxWidth: '100%' }}>
        <span className="g-eyebrow">Comece por aqui</span>
        <h2 style={{ marginTop: 6 }}>Escolha seu treino</h2>
        <p className="g-mut g-sm">Programas publicados pelo AVAGYM e por profissionais verificados.</p>
        <button className="g-btn" style={{ marginTop: 12 }} onClick={() => nav(profile ? '/recomendados' : '/onboarding')} data-testid="start-choose">ESCOLHER MEU TREINO</button>
      </div></div>}
    <div className="g-card g-list" style={{ marginTop: 10 }}>
      <Li icon="clipboard" t="Todos os programas" s="Catálogo publicado" to="/programas" testid="start-catalog" />
      {routines.length > 0 && <Li icon="folder" t="Rotinas antigas" s="Somente consulta" to="/treinos?aba=historico" testid="start-routines" />}
    </div>
  </section>
}
