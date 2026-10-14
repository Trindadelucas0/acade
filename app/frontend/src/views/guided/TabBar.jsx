// AVADESK Fitness — navegação principal: 5 abas (Início, Treinos, Comunidade, Progresso, Perfil).
import { useLocation, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { loadSession } from '../../lib/guided.js'
import './guided.css'

const HIDE = ['treinar', 'concluido', 'onboarding', 'workout']
// cada rota pertence a uma aba
const GROUP = {
  hoje: 'inicio', inicio: 'inicio', avisos: 'inicio', acompanhamento: 'inicio', conversa: 'inicio',
  treinos: 'treinos', 'meu-programa': 'treinos', programas: 'treinos', programa: 'treinos', recomendados: 'treinos', library: 'treinos', plan: 'treinos', home: 'treinos',
  comunidade: 'comunidade', post: 'comunidade', profissional: 'comunidade', ranking: 'comunidade',
  progresso: 'progresso', stats: 'progresso', history: 'progresso', muscles: 'progresso'
}
export const tabOf = path => GROUP[path.split('/')[1] || 'hoje'] || 'perfil'
export default function GuidedTabBar() {
  const nav = useNavigate(), loc = useLocation()
  const cur = loc.pathname.split('/')[1] || 'hoje'
  if (HIDE.includes(cur)) return null
  const group = tabOf(loc.pathname)
  const live = !!loadSession()
  const Tab = ({ k, icon, label, to }) => <button className={group === k ? 'g-on' : ''} onClick={() => nav(to)} data-testid={'tab-' + k} aria-current={group === k ? 'page' : undefined}><Icon name={icon} /><span>{label}</span>{k === 'treinos' && live && <i className="g-live" aria-label="treino em andamento" />}</button>
  return <nav id="agtab" aria-label="Navegação principal">
    <Tab k="inicio" icon="house" label="Início" to="/hoje" />
    <Tab k="treinos" icon="dumbbell" label="Treinos" to="/treinos" />
    <Tab k="comunidade" icon="users" label="Comunidade" to="/comunidade" />
    <Tab k="progresso" icon="chart" label="Progresso" to="/progresso" />
    <Tab k="perfil" icon="person" label="Perfil" to="/perfil" />
  </nav>
}
