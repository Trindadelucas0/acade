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
export const toYmd = iso => new Date(new Date(iso).getTime() - 3 * 3600e3).toISOString().slice(0, 10)
export const addDays = (ymd, n) => toYmd(new Date(spInput(ymd)).getTime() + n * 86400e3)
