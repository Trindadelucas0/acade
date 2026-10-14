import { api } from './api.js'
const post = (p, b) => api(p, { method: 'POST', body: JSON.stringify(b || {}) })
export const CH = {
  cats: () => api('/api/challenge-categories'), list: f => api('/api/challenges?' + new URLSearchParams(f || {})), get: id => api('/api/challenge?id=' + id),
  save: b => post('/api/challenges', b), publish: id => post('/api/challenges/publish', { id }), transition: b => post('/api/challenges/transition', b),
  join: (id, extra) => post('/api/challenges/join', { id, ...extra }), leave: id => post('/api/challenges/leave', { id }),
  decide: b => post('/api/challenges/decide', b), remove: b => post('/api/challenges/remove', b), inviteStudents: (id, student_ids) => post('/api/challenges/invite-students', { id, student_ids }),
  invite: (id, b) => post('/api/challenges/invites', { id, ...b }), revoke: (id, invite_id) => post('/api/challenges/invites/revoke', { id, invite_id }),
  optout: (id, on) => post('/api/challenges/optout', { id, on }), adm: st => api('/api/adm/challenges?status=' + (st || ''))
}
export const TYPE_PT = { meta_individual: 'Meta individual', meta_coletiva: 'Meta coletiva', competicao_individual: 'Competição individual', competicao_equipes: 'Competição por equipes' }
export const METRIC_PT = { sessoes: 'Sessões válidas', dias_distintos: 'Dias distintos com treino', consistencia: 'Consistência proporcional (%)', semanas_meta: 'Semanas com meta cumprida', soma_coletiva: 'Soma coletiva de sessões' }
export const STATUS_PT = { rascunho: 'Rascunho', publicado: 'Publicado', inscricoes_abertas: 'Inscrições abertas', agendado: 'Agendado', em_andamento: 'Em andamento', apurando: 'Em apuração', concluido: 'Concluído', cancelado: 'Cancelado', suspenso: 'Suspenso' }
export const AUD_PT = { aberto: 'Aberto', aprovacao: 'Com aprovação', convite: 'Privado (convite)' }
export const MEM_PT = { convidado: 'Convidado', solicitado: 'Pedido enviado', aprovado: 'Inscrito', rejeitado: 'Recusado', ativo: 'Participando', saiu: 'Saiu', removido: 'Removido', desclassificado: 'Desclassificado' }
// data local (America/Sao_Paulo, UTC-3)
export const spDate = d => new Date(d).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short' })
export const spInput = ymd => new Date(ymd + 'T00:00:00-03:00').toISOString()
export const spEnd = ymd => new Date(ymd + 'T23:59:59.999-03:00').toISOString()
export const toYmd = iso => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10)
export const addDays = (ymd, n) => toYmd(new Date(spInput(ymd)).getTime() + n * 86400e3)

export const CAT = { list: () => api('/api/challenge-categories'), save: b => post('/api/adm/challenge-categories', b) }
export const CF = {
  feed: (id, page = 0) => api(`/api/challenges/feed?id=${id}&page=${page}`), post: b => post('/api/challenges/posts', b), publish: post_id => post('/api/challenges/posts/publish', { post_id }),
  del: (post_id, reason) => post('/api/challenges/posts/delete', { post_id, reason }), pin: (post_id, on) => post('/api/challenges/posts/pin', { post_id, on }),
  like: (post_id, on) => post('/api/challenges/posts/like', { post_id, on }), comment: (post_id, body) => post('/api/challenges/posts/comment', { post_id, body }),
  media: (id, data) => post('/api/challenges/media', { id, data }), sessions: id => api('/api/challenges/sessions?id=' + id),
  proofs: (id, mine) => api('/api/challenges/proofs?id=' + id + (mine ? '&mine=1' : '')), sendProof: b => post('/api/challenges/proofs', b),
  review: (proof_id, decision, reason) => post('/api/challenges/proofs/review', { proof_id, decision, reason }), replace: (proof_id, media_url) => post('/api/challenges/proofs/replace', { proof_id, media_url }),
  appeal: (proof_id, text) => post('/api/challenges/proofs/appeal', { proof_id, text }), report: (target_type, target_id, reason, details) => post('/api/reports', { target_type, target_id, reason, details }),
  prefs: () => api('/api/notification-prefs'), setPrefs: mute_social => post('/api/notification-prefs', { mute_social }),
  admProofs: () => api('/api/adm/proofs'), invalidate: (proof_id, reason) => post('/api/adm/proofs/invalidate', { proof_id, reason }),
  reviewers: () => api('/api/adm/proof-reviewers'), setReviewer: (email, on) => post('/api/adm/proof-reviewers', { email, on })
}
export const PROOF_PT = { enviado: 'Enviado', em_analise: 'Em análise', aprovado: 'Aprovado', rejeitado: 'Rejeitado', substituicao: 'Substituição pedida', recurso: 'Recurso em análise', invalidado: 'Invalidado' }
export const readFile = f => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => bad(new Error('Não foi possível ler o arquivo')); r.readAsDataURL(f) })
export const MAX_MB = { foto: 2.5, video: 3.5 }
