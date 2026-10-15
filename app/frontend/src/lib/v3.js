// AVAGYM V3 — chamadas das funcionalidades SaaS (identidade, planos, convites).
import { api } from './api.js'
const post = (p, b) => api(p, { method: 'POST', body: JSON.stringify(b || {}) })
export const V = {
  // Fase 2 — identidade global e verificação profissional
  context: () => api('/api/me/context'), setContext: context => post('/api/me/context', { context }),
  addCapacity: capacity => post('/api/me/capacities', { capacity }), me: () => api('/api/auth/me'),
  verification: () => api('/api/pro/verification'), submitVerification: b => post('/api/pro/verification', b),
  uploadDoc: (data, file_name) => post('/api/pro/verification/document', { data, file_name }),
  docUrl: id => (import.meta.env.VITE_API_BASE || '') + '/api/verification/document?id=' + id,
  admVerifications: status => api('/api/adm/verifications' + (status ? '?status=' + status : '')), decideVerification: b => post('/api/adm/verifications/decide', b)
}
export const VER_PT = { pendente: 'Em análise', correcao_solicitada: 'Correção solicitada', verificado: 'Verificado' }
export const readFileAsDataURL = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(new Error('Não foi possível ler o arquivo')); r.readAsDataURL(f) })
