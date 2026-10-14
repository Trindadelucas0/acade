import { useLocation, useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { loadSession } from '../../lib/guided.js'
import './guided.css'

const HIDE = ['treinar', 'concluido', 'onboarding', 'workout']
export default function GuidedTabBar() {
  const nav = useNavigate(), loc = useLocation()
  const cur = loc.pathname.split('/')[1] || 'hoje'
  if (HIDE.includes(cur)) return null
  const group = { hoje: 'hoje', 'meu-programa': 'hoje', programas: 'programas', programa: 'programas', recomendados: 'programas', progresso: 'progresso' }[cur] || 'perfil'
  const live = !!loadSession()
  const Tab = ({ k, icon, label, to }) => <button className={group === k ? 'g-on' : ''} onClick={() => nav(to)} data-testid={'tab-' + k}><Icon name={icon} /><span>{label}</span></button>
  return <nav id="agtab">
    <Tab k="hoje" icon="house" label="Hoje" to="/hoje" />
    <Tab k="programas" icon="clipboard" label="Programas" to="/programas" />
    <button className={'g-go' + (live ? ' g-rec' : '')} onClick={() => nav('/treinar')} data-testid="tab-treinar"><span className="g-cir"><Icon name={live ? 'play' : 'dumbbell'} /></span><span>{live ? 'Continuar' : 'Treinar'}</span></button>
    <Tab k="progresso" icon="chart" label="Progresso" to="/progresso" />
    <Tab k="perfil" icon="person" label="Perfil" to="/perfil" />
  </nav>
}
