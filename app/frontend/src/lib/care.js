// AVADESK Fitness — chamadas de acompanhamento, profissional e administração.
import { api } from './api.js'
const post = (p, b) => api(p, { method: 'POST', body: JSON.stringify(b || {}) })
export const C = {
  care: () => api('/api/care'), plan: id => api('/api/plan?id=' + id), blocks: () => api('/api/blocks'),
  occurrence: b => post('/api/occurrences', b), newThread: b => post('/api/threads', b), thread: id => api('/api/thread?id=' + id), send: (thread_id, body) => post('/api/messages', { thread_id, body }),
  notifications: () => api('/api/notifications'), readAll: () => post('/api/notifications/read', {}),
  pros: area => api('/api/professionals' + (area ? '?area=' + encodeURIComponent(area) : '')), pro: id => api('/api/professional?id=' + id),
  searchEx: t => api('/api/exercises/search?q=' + encodeURIComponent(t)),
  // profissional
  dash: () => api('/api/pro/dashboard'), saveProfile: b => post('/api/pro/profile', b), addQual: b => post('/api/pro/qualifications', b),
  student: id => api('/api/pro/student?id=' + id), savePlan: b => post('/api/pro/plans', b), archivePlan: (id, reason) => post('/api/pro/plans/archive', { id, reason }),
  assess: b => post('/api/pro/assess', b), closeOcc: (id, reason) => post('/api/pro/close-occurrence', { id, reason }), closeThread: id => post('/api/pro/close-thread', { id }),
  propose: b => post('/api/pro/proposals', b), decide: b => post('/api/pro/proposals/decide', b),
  // admin
  overview: () => api('/api/adm/overview'), users: (status, q) => api('/api/adm/users?' + new URLSearchParams({ ...(status ? { status } : {}), q: q || '' })),
  setStatus: (id, status, reason) => post('/api/adm/users/status', { id, status, reason }), setRole: (id, role, on) => post('/api/adm/users/role', { id, role, on }),
  setPlan: (id, plan_id) => post('/api/adm/users/plan', { id, plan_id }), plans: () => api('/api/adm/plans'), savePlanAcc: b => post('/api/adm/plans', b),
  admPros: () => api('/api/adm/professionals'), updPro: b => post('/api/adm/professionals', b), verify: (id, status, note) => post('/api/adm/qualifications/verify', { id, status, note }),
  links: () => api('/api/adm/links'), link: b => post('/api/adm/links', b), endLink: (id, reason) => post('/api/adm/links/end', { id, reason }),
  queue: () => api('/api/adm/queue'), assign: b => post('/api/adm/assign', b), admClose: (id, reason) => post('/api/adm/close-occurrence', { id, reason }),
  live: () => api('/api/adm/live'), userWorkouts: id => api('/api/adm/users/workouts?id=' + id),
  resetLink: id => post('/api/adm/users/reset-link', { id }),
  audit: () => api('/api/adm/audit'), settings: () => api('/api/adm/settings'), saveSettings: b => post('/api/adm/settings', b)
}
export const CAT_PT = { dor: 'Dor', desconforto: 'Desconforto', dificuldade: 'Dificuldade para realizar', duvida: 'Dúvida sobre a execução', outro: 'Outro motivo' }
export const OCC_ST = { aberta: 'Aguardando avaliação', orientada: 'Orientação registrada', encerrada: 'Encerrada' }
export const dt = d => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
export const initials = n => (n || '?').split(' ').filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('')
// comunidade e ranking
export const F = {
  cats: () => api('/api/feed/categories'), feed: p => api('/api/feed?' + new URLSearchParams(p || {})), post: id => api('/api/post?id=' + id),
  save: b => post('/api/posts', b), del: id => post('/api/posts/delete', { id }), like: (id, on) => post('/api/posts/like', { id, on }),
  comment: (post_id, body) => post('/api/comments', { post_id, body }), delComment: id => post('/api/comments/delete', { id }),
  report: b => post('/api/reports', b), follow: (professional_id, on) => post('/api/follows', { professional_id, on }), upload: data => post('/api/uploads', { data }),
  reports: st => api('/api/adm/reports?status=' + st), decide: b => post('/api/adm/reports/decide', b),
  ranking: period => api('/api/ranking?period=' + period), rankHist: () => api('/api/ranking/history'), rankPrefs: b => post('/api/ranking/prefs', b),
  admRanking: period => api('/api/adm/ranking?period=' + period), invalidate: (session_id, reason) => post('/api/adm/ranking/invalidate', { session_id, reason })
}
export const REPORT_PT = { ofensivo: 'Conteúdo ofensivo', prejudicial: 'Informação inadequada ou potencialmente prejudicial', privado: 'Divulgação de informações privadas', spam: 'Spam ou propaganda não autorizada', outro: 'Outro motivo' }
