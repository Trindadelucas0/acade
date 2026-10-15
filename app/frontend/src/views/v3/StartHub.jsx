// V3 · F6 — peças compartilhadas do aluno gratuito: "Retomar treino" e "Criar meu treino".
// Sem opção de duplicar treino (decisão do Lucas).
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { useStore } from '../../store/useStore.js'
import { loadSession } from '../../lib/guided.js'
import { liveOf, elapsedLabel } from '../../lib/start.js'
import { uid } from '../../lib/format.js'
import { DEFAULT_GLYPH } from '../../lib/glyphs.js'
import { loadStarterPlan } from '../../sheets.jsx'
import { Sheet } from '../app/kit.jsx'
const NO_ROUTINES = []

export function useLive() {
  const legacy = useStore(s => s.S?.active)
  return liveOf(loadSession(), legacy)
}

export function ResumeBar() {
  const live = useLive(), nav = useNavigate()
  if (!live) return null
  return <button className="g-resume" onClick={() => nav(live.to)} data-testid="resume-bar">
    <span className="g-ico"><Icon name={live.pending ? 'check' : 'play'} /></span>
    <span style={{ minWidth: 0, flex: 1 }}><b>{live.pending ? 'Treino concluído — falta salvar' : 'Treino em andamento'}</b><br />
      <span className="g-mut g-xs">{live.name || 'Treino'}{live.start && !live.pending ? ' · ' + elapsedLabel(live.start) : ''}</span></span>
    <span className="g-resume-cta">{live.pending ? 'Salvar' : 'Retomar'}</span>
  </button>
}

// "Criar meu treino": caminhos para o aluno montar o próprio treino
export function CreateWorkoutSheet({ onClose }) {
  const nav = useNavigate(), update = useStore(s => s.update), routines = useStore(s => s.S?.routines || NO_ROUTINES)
  const go = to => { onClose(); nav(to) }
  const fromScratch = () => {
    const r = { id: uid(), name: 'Minha rotina ' + (routines.length + 1), emoji: DEFAULT_GLYPH, ex: [] }
    update(s => { s.routines.push(r) }); go('/plan/r/' + r.id)
  }
  const Op = ({ icon, t, s, onClick, testid }) => <button className="g-li" onClick={onClick} data-testid={testid}>
    <span className="g-ico"><Icon name={icon} /></span><span style={{ minWidth: 0 }}><b>{t}</b><br /><span className="g-mut g-xs">{s}</span></span><span className="g-chev"><Icon name="play" /></span></button>
  return <Sheet title="Criar meu treino" onClose={onClose}>
    <div className="g-list" data-testid="create-workout">
      <Op icon="pencil" t="Montar do zero" s="Escolha os exercícios, séries, repetições e descanso" onClick={fromScratch} testid="cw-scratch" />
      <Op icon="sparkles" t="Receber uma recomendação" s="6 perguntas rápidas e indicamos um programa para você" onClick={() => go('/onboarding')} testid="cw-reco" />
      <Op icon="clipboard" t="Seguir um programa guiado" s="Programas prontos por objetivo, nível e local" onClick={() => go('/programas')} testid="cw-program" />
      {!routines.length && <Op icon="folder" t="Começar com um plano pronto" s="Carrega rotinas iniciais que você pode editar" onClick={() => { loadStarterPlan(); go('/treinos?aba=rotinas') }} testid="cw-starter" />}
      <Op icon="bolt" t="Treino rápido" s="Registre um treino avulso agora, sem planejar" onClick={() => go('/home')} testid="cw-quick" />
    </div>
  </Sheet>
}
