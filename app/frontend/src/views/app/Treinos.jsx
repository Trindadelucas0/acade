// Aba Treinos: programa guiado (Meu Programa, Programas, Recomendados) + planos do profissional + biblioteca + treino livre (openGym redesenhado).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { G, loadSession, minutesLabel } from '../../lib/guided.js'
import '../guided/guided.css'

export const Li = ({ icon, t, s, to, onClick, testid, badge }) => { const nav = useNavigate()
  return <button className="g-li" onClick={onClick || (() => nav(to))} data-testid={testid}>
    <span className="g-ico"><Icon name={icon} /></span><span style={{ minWidth: 0 }}><b>{t}</b>{s && <><br /><span className="g-mut g-xs">{s}</span></>}</span>
    {badge ? <span className="g-badge">{badge}</span> : null}<span className="g-chev"><Icon name="play" /></span></button> }

export default function Treinos() {
  const nav = useNavigate()
  const [st, setSt] = useState(null)
  const live = loadSession()
  useEffect(() => { G.state().then(setSt).catch(() => setSt(false)) }, [])
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
