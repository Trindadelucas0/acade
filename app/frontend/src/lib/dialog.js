// V4 · F1 — substitui alert/confirm/prompt nativos por modais e avisos do próprio app.
// Uso: await ask('Texto?', { danger:true, ok:'Excluir' }) → boolean · await askText('Motivo', { required:true }) → string|null
//      notify('Salvo') / notifyError(e) → aviso não bloqueante (role=status / role=alert).
import { create } from 'zustand'

export const useDialog = create(set => ({ dlg: null, notes: [], set }))
let seq = 0

function open(d) {
  return new Promise(resolve => {
    const prev = useDialog.getState().dlg
    if (prev) prev.resolve(prev.kind === 'confirm' ? false : null)   // um modal por vez; o anterior é cancelado
    useDialog.getState().set({ dlg: { ...d, id: ++seq, resolve: v => { useDialog.getState().set({ dlg: null }); resolve(v) } } })
  })
}
export const ask = (title, o = {}) => open({ kind: 'confirm', title, ...o })
export const askText = (title, o = {}) => open({ kind: 'prompt', title, ...o })
// mostra um valor para copiar (ex.: link de redefinição) — substitui o diálogo nativo de texto com valor
export const showValue = (title, value, o = {}) => open({ kind: 'value', title, value, ...o })

export function notify(msg, tone = 'ok', ms = 3800) {
  if (!msg) return
  const id = ++seq
  const add = s => ({ notes: [...s.notes.slice(-2), { id, msg: String(msg), tone }] })
  useDialog.setState(add)
  setTimeout(() => useDialog.setState(s => ({ notes: s.notes.filter(n => n.id !== id) })), tone === 'error' ? ms + 2200 : ms)
}
export const notifyError = e => notify(e?.reasons ? e.reasons.join(' · ') : (e?.message || String(e || 'Algo deu errado.')), 'error')
