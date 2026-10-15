// V3 · F6 — regras puras do "começar a treinar" do aluno gratuito (testadas no vitest).
export const TREINO_TABS = [['rotinas', 'Minhas rotinas'], ['programas', 'Programas guiados'], ['profissionais', 'Dos meus profissionais']]
// aba inicial de Meus treinos: o que o aluno tem de mais "pronto para treinar"
export function defaultTab({ plans = 0, active = false, routines = 0 } = {}) {
  if (plans > 0) return 'profissionais'
  if (active) return 'programas'
  if (routines > 0) return 'rotinas'
  return 'programas'
}
export const validTab = k => TREINO_TABS.some(([t]) => t === k)
export function elapsedLabel(start, now = Date.now()) {
  const t = typeof start === 'number' ? start : new Date(start).getTime()
  if (!Number.isFinite(t)) return ''
  const m = Math.max(0, Math.round((now - t) / 60000))
  return m < 1 ? 'começou agora' : m < 60 ? `há ${m} min` : `há ${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min`
}
// treino em andamento: guiado (servidor/programa/ficha) ou treino livre (rotinas locais)
export function liveOf(guided, legacy) {
  if (guided && guided.finished_at) return { kind: 'guiado', pending: true, name: guided.workout_name, start: guided.started_at, to: '/concluido' }
  if (guided) return { kind: 'guiado', pending: false, name: guided.workout_name, start: guided.started_at, to: '/treinar' }
  if (legacy) return { kind: 'livre', pending: false, name: legacy.name, start: legacy.start, to: '/workout' }
  return null
}
