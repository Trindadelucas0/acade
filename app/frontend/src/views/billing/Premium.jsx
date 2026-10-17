// Lote 7 (16/10/2026): CADEADO nos recursos premium para quem esta sem plano (sem assinatura, teste ou personal).
// Regra de bloqueio: SO no servidor (access.js monetizationGate), seguindo a chave 'Monetizacao ativa'. A interface
// mostra o cadeado quando o acesso e negado: (a) /api/access/me diz monetized && !has_any, ou (b) qualquer rota
// respondeu 402 ACCESS_REQUIRED (evento 'avagym:access-required'). Com a monetizacao desligada nada aparece travado.
import { create } from 'zustand'
import { api } from '../../lib/api.js'
import { useStore } from '../../store/useStore.js'
import Icon from '../../components/Icon.jsx'
import './premium.css'

export const usePremiumStore = create((set, get) => ({
  acc: null, denied: false, loading: false,
  async load() {
    if (get().loading) return
    set({ loading: true })
    try { const acc = await api('/api/access/me'); set({ acc, denied: acc.monetized && !acc.has_any ? get().denied : false }) } catch { /* sem rede: mantem o ultimo estado */ } finally { set({ loading: false }) }
  },
  deny() { set({ denied: true }) },
  reset() { set({ acc: null, denied: false }) }
}))

const exempt = u => !u || u.admin || (u.roles || []).includes('admin') || !((u.roles || []).includes('aluno') || (u.roles || []).includes('profissional'))
// locked(aud): true quando o servidor nega (ou negaria) o acesso premium. aud 'profissional' = rotas /api/pro/*
export function usePremium(aud) {
  const user = useStore(s => s.user), { acc, denied } = usePremiumStore()
  if (exempt(user)) return { locked: false, ready: true, acc }
  const noAccess = !!acc?.monetized && (aud === 'profissional' ? !acc.audiences?.profissional?.has : !acc.has_any)
  return { locked: noAccess || (denied && !acc?.has_any), ready: !!acc, acc }
}

export const PREMIUM_TEXT = 'Este recurso faz parte dos planos Individual e PRO. Seus dados continuam guardados e voltam assim que você assinar ou ativar o teste de 7 dias com cupom.'
// cartao de cadeado: preview (opcional) aparece desfocado por tras, sem interacao
export function PremiumLock({ title, desc, feature, preview, compact, cta = 'Ver planos' }) {
  return <section className={'pm-lock' + (compact ? ' pm-compact' : '') + (preview ? ' pm-has-preview' : '')} data-testid="premium-lock" data-feature={feature || title}>
    {preview && <div className="pm-preview" aria-hidden="true" inert="">{preview}</div>}
    <div className="pm-body">
      <span className="pm-ico" aria-hidden="true"><Icon name="lock" /></span>
      <div className="pm-txt"><b>{title}</b>{!compact && <p>{desc || PREMIUM_TEXT}</p>}</div>
      <div className="pm-actions">
        <a className="pm-btn" href="#/assinatura?acesso=bloqueado" data-testid="premium-cta"><Icon name="crown" /> {cta}</a>
        {!compact && <a className="pm-link" href="#/assinatura" data-testid="premium-coupon">Tenho um cupom de 7 dias</a>}
      </div>
    </div>
  </section>
}
// pagina inteira travada (rotas premium)
const PAGE_ITEMS = [['dumbbell', 'Treinos guiados e fichas do seu personal'], ['chart', 'Progresso, músculos trabalhados e estatísticas'], ['users', 'Comunidade, desafios e ranking'], ['trophy', 'Recordes e troféus']]
export function PremiumPage({ title }) {
  return <div className="ag" data-testid="premium-page"><span className="g-eyebrow">{title}</span><h1>{title}</h1>
    <PremiumLock title={`${title} é um recurso premium`} feature={title} />
    <ul className="pm-list">{PAGE_ITEMS.map(([i, t]) => <li key={t}><span><Icon name={i} /></span>{t}</li>)}</ul>
  </div>
}
// envolve um trecho premium: travado -> cadeado; liberado -> conteudo
export function Premium({ title, desc, feature, preview, compact, aud, children }) {
  const { locked } = usePremium(aud)
  return locked ? <PremiumLock title={title} desc={desc} feature={feature} preview={preview} compact={compact} /> : children
}
// marcador de cadeado (abas, itens de lista)
export const LockBadge = () => <span className="pm-badge" aria-label="recurso premium bloqueado" data-testid="lock-badge"><Icon name="lock" /></span>
