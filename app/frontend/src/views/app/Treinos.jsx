// Aba Treinos: programa guiado (Meu Programa, Programas, Recomendados) + planos do profissional + biblioteca + treino livre (openGym redesenhado).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { G, loadSession, minutesLabel } from '../../lib/guided.js'
import { C } from '../../lib/care.js'
import '../guided/guided.css'

export const Li = ({ icon, t, s, to, onClick, testid, badge }) => { const nav = useNavigate()
  return <button className="g-li" onClick={onClick || (() => nav(to))} data-testid={testid}>
    <span className="g-ico"><Icon name={icon} /></span><span style={{ minWidth: 0 }}><b>{t}</b>{s && <><br /><span className="g-mut g-xs">{s}</span></>}</span>
    {badge ? <span className="g-badge">{badge}</span> : null}<span className="g-chev"><Icon name="play" /></span></button> }

export default function Treinos() {
  const nav = useNavigate()
  const [st, setSt] = useState(null)
  const live = loadSession()
  const [care, setCare] = useState(null)
  useEffect(() => { G.state().then(setSt).catch(() => setSt(false)); C.care().then(setCare).catch(() => {}) }, [])
  const a = st && st.active
  return <div className="ag" data-testid="treinos">
    <span className="g-eyebrow">Treinos</span>
    <h1>Seus treinos</h1>
    <div className="g-card" style={{ marginTop: 12 }}>
      {a ? <><span className="g-mut g-xs">Programa ativo</span><h3 style={{ marginTop: 4 }}>{a.title}</h3>
        <p className="g-mut g-sm">Semana {a.week_index} de {a.weeks} · {minutesLabel(a)}</p></>
        : <><h3>Sem programa ativo</h3><p className="g-mut g-sm">Responda algumas perguntas e receba uma recomendação.</p></>}
      <button className="g-btn" style={{ marginTop: 12 }} onClick={() => nav(live || a ? '/treinar' : '/recomendados')} data-testid="treinos-start">
        <Icon name={live ? 'play' : 'dumbbell'} /> {live ? 'Continuar treino' : a ? 'Começar treino' : 'Escolher programa'}</button>
    </div>
    {care?.plans?.length > 0 && <><h2>Planos dos seus profissionais</h2>
      <div className="g-card g-list">{care.plans.map(p => <div key={p.id} className="g-li" style={{ display: 'block' }} data-testid="pro-plan">
        <b>{p.title}</b><br /><span className="g-mut g-xs">Responsável: {p.owner_name} · {p.exercises.length} exercícios</span>
        {p.notes && <p className="g-sm g-mut" style={{ marginTop: 4 }}>{p.notes}</p>}
        {p.description && <p className="g-sm" style={{ marginTop: 4 }} data-testid="plan-description">{p.description}</p>}
        {p.days?.length > 1 ? <div className="g-row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 8 }}>{p.days.map((d, i) => <button key={i} className="g-btn g-sm" style={{ width: 'auto', padding: '0 14px' }} disabled={!!live} onClick={() => nav(`/treinar?plan=${p.id}&day=${i}`)} data-testid="plan-day">{d.name} · {d.exercises.length}</button>)}</div>
          : <button className="g-btn g-sm" style={{ marginTop: 8 }} disabled={!!live} onClick={() => nav('/treinar?plan=' + p.id)}>Abrir treino</button>}</div>)}</div></>}
    <h2>Programa guiado</h2>
    <div className="g-card g-list">
      <Li icon="calendar" t="Meu programa" s="Treinos da semana e progresso" to="/meu-programa" />
      <Li icon="sparkles" t="Recomendados para você" s="Objetivo, nível, local, frequência, tempo e restrições" to="/recomendados" />
      <Li icon="clipboard" t="Todos os programas" to="/programas" />
      <Li icon="pencil" t="Refazer perguntas" to="/onboarding" />
    </div>
    <h2>Explorar</h2>
    <div className="g-card g-list">
      <Li icon="list" t="Biblioteca de exercícios" s="Com fotos, animações e instruções" to="/library" />
      <Li icon="person" t="Corpo 3D" s="Toque no músculo e veja exercícios" to="/muscles" />
    </div>
    <h2>Treino livre</h2>
    <div className="g-card g-list">
      <Li icon="folder" t="Minhas rotinas" s="Monte e execute a sua própria ficha" to="/plan" testid="manual" />
      <Li icon="bolt" t="Treino rápido" s="Registrar um treino avulso" to="/home" />
    </div>
  </div>
}
