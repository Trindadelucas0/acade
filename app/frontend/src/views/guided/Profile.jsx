import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { useStore } from '../../store/useStore.js'
import { G, GOAL_PT, LEVEL_PT, LOC_PT, RESTR_PT } from '../../lib/guided.js'
import './guided.css'

const SOURCE_URL = import.meta.env.VITE_SOURCE_URL || ''
export default function Profile() {
  const nav = useNavigate()
  const user = useStore(s => s.user)
  const signOut = useStore(s => s.signOut)
  const [st, setSt] = useState(null)
  useEffect(() => { G.state().then(setSt).catch(() => {}) }, [])
  const p = st?.profile
  const pro = user?.roles?.some(r => r === 'admin' || r === 'profissional')
  const Li = ({ icon, t, s, to, onClick, testid }) => <button className="g-li" onClick={onClick || (() => nav(to))} data-testid={testid}>
    <span className="g-ico"><Icon name={icon} /></span><span><b>{t}</b>{s && <><br /><span className="g-mut g-xs">{s}</span></>}</span><span className="g-chev"><Icon name="play" /></span></button>
  return <div className="ag" data-testid="profile">
    <span className="g-eyebrow">Perfil</span>
    <h1>{user?.name || 'Visitante'}</h1>
    <p className="g-mut g-sm">{user?.email}{user?.tenant?.name ? ' · ' + user.tenant.name : ''}</p>
    {p && <div className="g-card" style={{ marginTop: 14 }}>
      <b className="g-sm">Suas respostas</b>
      <div className="g-chips" style={{ marginTop: 8 }}>
        <span className="g-chip g-on">{GOAL_PT[p.objetivo]}</span><span className="g-chip">{LEVEL_PT[p.nivel]}</span><span className="g-chip">{LOC_PT[p.local]}</span>
        <span className="g-chip">{p.dias} dias</span><span className="g-chip">{p.minutos} min</span>
        {(p.restricoes || []).map(r => <span key={r} className="g-chip">{RESTR_PT[r]}</span>)}
      </div>
      <button className="g-link" onClick={() => nav('/onboarding')}>Refazer perguntas</button>
    </div>}
    <h2>Conta</h2>
    <div className="g-card g-list">
      <Li icon="chat" t="Acompanhamento" s="Profissionais, dúvidas e ocorrências" to="/acompanhamento" />
      <Li icon="bell" t="Avisos" to="/avisos" />
      {user?.pro && <Li icon="clipboard" t="Área profissional" s="Alunos, atendimentos e perfil profissional" to="/pro" testid="pro-area" />}
      {user?.admin && <Li icon="shield" t="Painel administrativo" s="Liberações, profissionais, vínculos, filas e auditoria" to="/admin/painel" testid="admin-area" />}
    </div>
    <h2>Treino</h2>
    <div className="g-card g-list">
      <Li icon="calendar" t="Meu programa" to="/meu-programa" />
      <Li icon="person" t="Mapa muscular 3D" s="Toque no músculo e veja exercícios" to="/muscles" />
      <Li icon="g-list" t="Biblioteca de exercícios" to="/library" />
    </div>
    <h2>Avançado</h2>
    <div className="g-card g-list">
      <Li icon="pencil" t="Criar treino manual" s="Para quem já sabe montar a própria ficha" to="/plan" testid="manual" />
      <Li icon="chart" t="Estatísticas detalhadas" to="/stats" />
      <Li icon="gear" t="Configurações" to="/settings" />
      {pro && <Li icon="clipboard" t="Programas (profissionais)" s="Status: rascunho, revisão, publicado, arquivado" to="/admin/programas" />}
      {user?.admin && <Li icon="shield" t="Administração" to="/admin" />}
    </div>
    {user && <button className="g-btn g-danger" style={{ marginTop: 18 }} onClick={() => signOut()}>Sair da conta</button>}
    <div className="g-dim g-xs g-center" style={{ marginTop: 22, lineHeight: 1.6 }} data-testid="about">
      <b>Sobre e licença</b><br />
      AVADESK Fitness (antigo AVAGYM) é baseado no openGym © 2026 Duarte Santos, licenciado sob a GNU AGPL v3.0 (veja LICENSE e NOTICE).<br />
      Modelo anatômico 3D: Z-Anatomy (Lluís Vinent Juanico, baseado em BodyParts3D/DBCLS), CC BY-SA 4.0, modificado. Dados de exercícios: hasaneyldrm/exercises-dataset (MIT); mídia © Gym visual. Fotos de perdigueiro (PTPioneer, CC BY 2.0) e pêndulo de Codman (M.C. Morgan, CC0) via Wikimedia Commons.<br />
      {SOURCE_URL && <a href={SOURCE_URL} target="_blank" rel="noopener" style={{ color: 'var(--ag-acc)' }}>Código-fonte</a>}
    </div>
  </div>
}
