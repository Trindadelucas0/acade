// AVAGYM — treino guiado: chamadas da API, rótulos pt-BR, mídia e sessão local (offline-safe).
import { api } from './api.js'
import { EXIDX, imgSrc, gifSrc } from './exercises.js'

export const G = {
  state: () => api('/api/guided/state'),
  onboarding: p => api('/api/guided/onboarding', { method: 'POST', body: JSON.stringify(p) }),
  recs: () => api('/api/guided/recommendations'),
  programs: goal => api('/api/guided/programs' + (goal ? '?goal=' + goal : '')),
  program: id => api('/api/guided/program?id=' + encodeURIComponent(id)),
  start: id => api('/api/guided/start', { method: 'POST', body: JSON.stringify({ program_id: id }) }),
  abandon: reason => api('/api/guided/abandon', { method: 'POST', body: JSON.stringify({ reason }) }),
  today: wid => api('/api/guided/today' + (wid ? '?workout=' + wid : '')),
  saveSession: s => api('/api/guided/sessions', { method: 'POST', body: JSON.stringify(s) }),
  progress: () => api('/api/guided/progress'),
  adminPrograms: () => api('/api/guided/admin/programs'),
  setStatus: (id, status) => api('/api/guided/admin/program-status', { method: 'POST', body: JSON.stringify({ id, status }) })
}

export const GOALS = [
  ['hypertrophy', 'Ganhar massa', 'arm'], ['weight_loss', 'Emagrecer', 'flame'], ['strength', 'Ficar mais forte', 'barbell'],
  ['conditioning', 'Condicionamento', 'heart'], ['mobility', 'Mobilidade', 'stretch'], ['home', 'Treino em casa', 'house'], ['rehab', 'Reabilitação', 'shield']
]
export const GOAL_PT = Object.fromEntries(GOALS.map(g => [g[0], g[1]]))
export const LEVEL_PT = { beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado' }
export const LOC_PT = { gym: 'Academia', home: 'Em casa', home_noequip: 'Sem equipamento' }
export const RESTR_PT = { knee: 'Joelho', lumbar: 'Lombar', shoulder: 'Ombro', other: 'Outra' }

// mídia: "exdb:<id>" aponta para o catálogo do app (imagem + animação)
export const mediaOf = m => {
  if (m && (m.startsWith('/') || m.startsWith('http'))) return { img: m, gif: m, local: true }
  const ex = m && m.startsWith('exdb:') ? EXIDX[m.slice(5)] : null
  return ex ? { img: imgSrc(ex), gif: gifSrc(ex) } : null
}
export const minutesLabel = p => p.minutes_max && p.minutes_max !== p.minutes ? `${p.minutes}–${p.minutes_max} min` : `${p.minutes} min`
export const repsLabel = e => e.reps_min || e.reps_max
  ? (e.reps_min && e.reps_max && e.reps_min !== e.reps_max ? `${e.reps_min}–${e.reps_max} repetições` : `${e.reps_max || e.reps_min} repetições`)
  : `${e.duration_sec} segundos`
export const fmtMin = s => { const m = Math.round((s || 0) / 60); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min` }
export const fmtKg = n => (Math.round((+n || 0) * 10) / 10).toLocaleString('pt-BR') + ' kg'

// ---------- sessão local ----------
const KEY = 'avagym_guided_session_v1', QUEUE = 'avagym_guided_queue_v1', LAST = 'avagym_guided_last_v1'
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
export const loadSession = () => read(KEY, null)
export const saveSessionLocal = s => { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY) }
export const lastFinished = () => read(LAST, null)
export const setLastFinished = s => localStorage.setItem(LAST, JSON.stringify(s))

export function newSession(today) {
  const w = today.workout
  return {
    client_id: (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)),
    user_program_id: today.active.id, program_workout_id: w.id, workout_name: w.name, program_title: today.active.title,
    started_at: new Date().toISOString(), exIdx: 0, rest: null, cur_start: Date.now(), last_end: null, pending_target: null, paused_sec: 0, paused_at: null,
    exercises: w.exercises.map(e => ({
      exercise_id: e.exercise_id, name: e.name, media: e.media, sets: e.sets || 3, reps_min: e.reps_min, reps_max: e.reps_max,
      duration_sec: e.duration_sec, rest_sec: e.rest_sec || 60, instructions: e.instructions, cautions: e.cautions || [],
      timed: !e.reps_min && !e.reps_max, weight: e.suggestion?.weight ?? null, reps: e.suggestion?.reps ?? (e.reps_min || e.reps_max || e.duration_sec || 10),
      note: e.suggestion?.note || null, last: e.last, done: []
    }))
  }
}
export const sessionSets = s => s.exercises.flatMap(e => e.done.map((d, i) => ({ exercise_id: e.exercise_id, set_index: i, weight: e.timed ? null : d.weight, reps: e.timed ? null : d.reps, duration_sec: e.timed ? d.reps : null, done_at: d.at, target_reps: e.reps_max || e.reps_min || null, started_at: d.started_at || null, rest_sec_real: d.rest_sec_real ?? null, rest_sec_target: d.rest_sec_target ?? null, name: e.name })))
export const payloadOf = (s, extra = {}) => ({
  client_id: s.client_id, user_program_id: s.user_program_id, program_workout_id: s.program_workout_id, workout_name: s.workout_name,
  started_at: s.started_at, sets: sessionSets(s), prescribed_count: s.exercises.length, pro_plan_id: s.plan_id || null, paused_sec: Math.round(s.paused_sec || 0), ...extra
})

// fila de sincronização: sessões concluídas que ainda não chegaram ao servidor
export function enqueue(p) { const q = read(QUEUE, []).filter(x => x.client_id !== p.client_id); q.push(p); localStorage.setItem(QUEUE, JSON.stringify(q)) }
export const pendingCount = () => read(QUEUE, []).length
export async function flushQueue() {
  const q = read(QUEUE, []); const left = []
  for (const p of q) { try { await G.saveSession(p) } catch (e) { if (e.status && e.status < 500 && e.status !== 401) continue; left.push(p) } }
  localStorage.setItem(QUEUE, JSON.stringify(left)); return left.length
}
if (typeof window !== 'undefined') window.addEventListener('online', () => { flushQueue().catch(() => {}) })
