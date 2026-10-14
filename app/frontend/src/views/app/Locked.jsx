// Estado "aguardando liberação": a conta entra no app, mas as funcionalidades ficam travadas até a administração liberar.
import { useStore } from '../../store/useStore.js'
import Icon from '../../components/Icon.jsx'
import '../guided/guided.css'
export const isPending = u => !!u && u.status && u.status !== 'ativo'
export function PendingCard() {
  return <div className="g-card g-pending" data-testid="pending">
    <div className="g-row"><span className="g-ico"><Icon name="clock" /></span><b>Conta aguardando liberação</b></div>
    <p className="g-mut g-sm" style={{ marginTop: 8 }}>Seu cadastro foi recebido. A equipe AVADESK vai revisar e liberar seu acesso aos treinos, à comunidade e aos profissionais. Você será avisado(a) aqui.</p>
  </div>
}
export default function Gate({ children, title }) {
  const user = useStore(s => s.user)
  if (!isPending(user)) return children
  return <div className="ag"><span className="g-eyebrow">{title}</span><h1>{title}</h1><div style={{ marginTop: 14 }}><PendingCard /></div></div>
}
