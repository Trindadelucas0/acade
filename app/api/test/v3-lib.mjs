// Utilitários dos testes de API da V3 (chamadas diretas à API, sem UI). Contas criadas aqui usam @e2e.local
// e são removidas com: npm run remover-usuarios -- --confirmar REMOVER --e2e
import '../env.js'
import { q } from '../db/pool.js'
export const B = process.env.API || 'http://localhost:8787'
export const PASS = process.env.E2E_PASSWORD || 'e2e-Avadesk-2026'
let ok = 0, bad = 0
export const check = (cond, msg) => { if (cond) { ok++; console.log('  ✓', msg) } else { bad++; console.log('  ✗', msg) } }
export const summary = () => { console.log(`\n${ok} ok, ${bad} falha(s)`); return bad }
export async function call(tok, method, path, body) {
  const r = await fetch(B + path, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined })
  let d = {}; try { d = await r.json() } catch { /* binário */ }
  return { s: r.status, d }
}
export const get = (t, p) => call(t, 'GET', p), post = (t, p, b) => call(t, 'POST', p, b || {})
export const login = async email => (await post(null, '/api/auth/login', { email, password: PASS })).d.token
// cria conta pelo cadastro público (intent aluno|profissional) e libera com o admin
export async function signup(adm, label, intent = 'aluno') {
  const terms = (await get(null, '/api/terms')).d.terms
  const email = `${label}${Date.now()}${Math.floor(Math.random() * 1e4)}@e2e.local`
  const r = await post(null, '/api/auth/register', { name: 'V3 ' + label, email, password: PASS, accept_terms: true, terms_version: terms?.version, intent })
  if (r.s !== 200) throw new Error('cadastro falhou: ' + JSON.stringify(r.d))
  await post(adm, '/api/adm/users/status', { id: r.d.user.id, status: 'ativo' })
  return { id: r.d.user.id, email, tok: r.d.token, user: r.d.user }
}
export { q }
