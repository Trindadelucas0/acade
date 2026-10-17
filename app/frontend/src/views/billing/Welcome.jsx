// Lote 7 (16/10/2026): boas-vindas depois de assinar ou ativar o teste. Mostra o que foi liberado com atalho para
// cada recurso. Uma vez por ativacao: o servidor diz qual ativacao esta pendente (GET /api/access/welcome) e a
// tela registra a exibicao ao abrir (POST /api/access/welcome/seen -> tabela access_welcome).
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../../lib/api.js'
import { useStore } from '../../store/useStore.js'
import Icon from '../../components/Icon.jsx'
import './premium.css'

export const UNLOCKED = {
  aluno: [
    ['dumbbell', 'Treino guiado', 'Passo a passo, com cronômetro de descanso e carga sugerida.', '/hoje'],
    ['clipboard', 'Programas para o seu objetivo', 'Escolha um programa do AVAGYM ou siga a ficha do seu personal.', '/programas'],
    ['person', 'Músculos trabalhados', 'Mapa do corpo, frente e costas, com o que você treinou.', '/progresso'],
    ['chart', 'Estatísticas detalhadas', 'Volume, frequência, 1RM estimado, recordes e consistência.', '/estatisticas'],
    ['users', 'Comunidade e desafios', 'Publicações, grupos e desafios com outros alunos.', '/comunidade'],
    ['trophy', 'Ranking e troféus', 'Some pontos a cada treino e acompanhe sua posição.', '/ranking']
  ],
  profissional: [
    ['house', 'Painel do personal', 'Seus alunos, pendências e atendimentos num só lugar.', '/pro'],
    ['users', 'Alunos', 'Convide, cadastre e acompanhe cada aluno.', '/pro?tab=alunos'],
    ['pencil', 'Construtor de treinos', 'Monte fichas com dias, séries, cargas e observações.', '/pro/treino'],
    ['globe', 'Fichas publicadas', 'Publique programas na biblioteca do AVAGYM.', '/pro/programas'],
    ['chat', 'Atendimentos', 'Conversas e ocorrências com seus alunos.', '/pro?tab=atendimentos'],
    ['crown', 'Assinatura PRO e vagas', 'Veja quantos alunos ativos o seu plano permite.', '/pro/assinatura']
  ]
}
const dBR = d => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export function WelcomeModal({ w, name, onClose, onGo }) {
  const items = UNLOCKED[w.audience] || UNLOCKED.aluno
  return <div className="wl-back" role="dialog" aria-modal="true" aria-labelledby="wl-ttl" data-testid="welcome-modal">
    <div className="wl-card">
      <div className="wl-hero"><span className="wl-burst" aria-hidden="true"><Icon name="sparkles" /></span>
        <span className="wl-eyebrow">{w.kind === 'teste' ? 'Teste de 7 dias ativado' : 'Assinatura confirmada'}</span>
        <h2 id="wl-ttl">Obrigado{name ? ', ' + name : ''}!</h2>
        <p>{w.kind === 'teste' ? <>Seu teste do plano <b>{w.plan_name}</b> está valendo{w.until ? <> até <b>{dBR(w.until)}</b></> : ''}. Aproveite tudo, sem cartão e sem cobrança automática.</>
          : <>Seu plano <b>{w.plan_name}</b> está ativo. Tudo abaixo já está liberado para você.</>}</p>
      </div>
      <h3 className="wl-h3">O que foi liberado</h3>
      <ul className="wl-list">{items.map(([icon, t, d, to]) => <li key={to}>
        <button onClick={() => onGo(to)} data-testid={'welcome-go-' + to.replace(/[^a-z]/g, '')}><span className="wl-ico"><Icon name={icon} /></span>
          <span className="wl-t"><b>{t}</b><small>{d}</small></span><span className="wl-arrow" aria-hidden="true">›</span></button></li>)}</ul>
      <button className="wl-main" onClick={() => onGo(w.audience === 'profissional' ? '/pro' : '/hoje')} data-testid="welcome-start">Começar agora</button>
      <button className="wl-later" onClick={onClose} data-testid="welcome-close">Ver depois</button>
    </div>
  </div>
}

export default function WelcomeHost() {
  const user = useStore(s => s.user), nav = useNavigate(), loc = useLocation()
  const [w, setW] = useState(null)
  const check = () => api('/api/access/welcome').then(r => {
    if (!r.welcome) return
    setW(r.welcome)
    api('/api/access/welcome/seen', { method: 'POST', body: JSON.stringify({ key: r.welcome.key }) }).catch(() => {})   // registra ao abrir: uma vez por ativacao
  }).catch(() => {})
  useEffect(() => { if (user?.id && !user.must_change_password && !user.needs_terms) check() }, [user?.id])
  useEffect(() => { const on = () => check(); window.addEventListener('avagym:access-changed', on); return () => window.removeEventListener('avagym:access-changed', on) }, [])
  if (!w || loc.pathname.startsWith('/treinar')) return null
  return <WelcomeModal w={w} name={(user?.name || '').split(' ')[0]} onClose={() => setW(null)} onGo={to => { setW(null); nav(to) }} />
}
