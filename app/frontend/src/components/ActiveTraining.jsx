// V4.1 — treino ativo (UMA ficha por vez) e como trocar. Regras do Lucas:
// programa do sistema → o aluno pode desvincular (arquiva) e escolher outro ou aceitar a ficha do profissional;
// ficha do profissional → catálogo bloqueado; só o profissional retira a ficha (decisão do Lucas).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon.jsx'
import { AT, activeLabel } from '../lib/active.js'
import { ask, notify, notifyError } from '../lib/dialog.js'

export async function detachSystem(at, then) {
  if (!await ask('Desvincular este programa?', { text: `"${at?.program?.title || 'Programa'}" sai do seu treino ativo e fica no histórico (nada é apagado). Depois você escolhe outro programa ou aceita a ficha do seu profissional.`, ok: 'Desvincular', cancel: 'Manter', danger: true })) return null
  try { const r = await AT.detach(); notify('Programa desvinculado.'); then?.(r); return r } catch (e) { notifyError(e); return null }
}

export function CoachLockNote() {
  const [at, setAt] = useState(null)
  useEffect(() => { AT.get().then(setAt).catch(() => {}) }, [])
  if (!at?.locked_to_pro) return null
  return <p className="g-note" style={{ margin: '10px 0' }} role="note" data-testid="coach-lock">Você treina com a ficha de <b>{at.pro_plan?.owner_name}</b>. Programas avulsos do sistema ficam bloqueados enquanto ela estiver ativa — você pode consultá-los, mas não iniciar. Para trocar, fale com seu profissional.</p>
}

export default function ActiveTrainingBanner({ at, compact, onChange }) {
  const nav = useNavigate()
  if (!at) return null
  const name = at.kind === 'sistema' ? at.program?.title : at.pro_plan ? `${at.pro_plan.title} · ${at.pro_plan.owner_name}` : null
  return <div className="g-card" style={{ marginTop: compact ? 10 : 14 }} data-testid="active-training">
    <div className="g-row" style={{ flexWrap: 'wrap', gap: 8 }}>
      <span className="g-activebadge"><Icon name="check" /> Treino ativo</span>
      <span className="g-mut g-xs">{activeLabel(at)}</span>
    </div>
    {name ? <b style={{ display: 'block', marginTop: 6 }}>{name}</b> : <p className="g-mut g-sm" style={{ marginTop: 6 }}>Você ainda não tem treino ativo.</p>}
    {at.kind === 'sistema' && <>
      {at.pending_pro_plans?.length > 0 && <p className="g-note" style={{ marginTop: 8 }} data-testid="pending-pro">Seu profissional enviou a ficha <b>{at.pending_pro_plans[0].title}</b>. Você só pode ter uma ficha por vez: desvincule o programa atual para aceitá-la.</p>}
      {!compact && <details className="org-details"><summary>Gerenciar programa</summary><button className="g-link" onClick={() => detachSystem(at, onChange)} data-testid="active-detach">Desvincular programa</button></details>}
    </>}
    {at.kind === 'profissional' && <p className="g-mut g-xs" style={{ marginTop: 6 }} data-testid="pro-locked">Ficha passada pelo seu profissional. Só ele pode retirá-la ou trocá-la; enquanto isso, programas avulsos do sistema ficam bloqueados.</p>}
    {!at.kind && <button className="g-link" onClick={() => nav('/recomendados')}>Escolher um programa</button>}
  </div>
}
