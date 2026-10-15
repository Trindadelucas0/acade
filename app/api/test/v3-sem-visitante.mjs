// Sem modo visitante: toda rota /api/* que não é login/cadastro/recuperação/termos/saúde exige login.
import fs from 'node:fs'
const BASE = process.env.BASE || 'http://localhost:8787'
const PUBLIC = new Set(['GET /api/config', 'GET /api/health', 'GET /api/media', 'GET /api/push/public-key', 'GET /api/terms',
  'POST /api/auth/forgot', 'POST /api/auth/login', 'POST /api/auth/logout', 'POST /api/auth/register', 'POST /api/auth/reset', 'POST /api/logout'])
const routes = new Set()
for (const f of fs.readdirSync(new URL('..', import.meta.url)).filter(f => f.endsWith('.js')))
  for (const m of fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').matchAll(/['"`](GET|POST|PUT|DELETE|PATCH) (\/api\/[^'"`\s]+)['"`]/g)) routes.add(m[1] + ' ' + m[2])
let ok = 0, bad = []
for (const k of [...routes].sort()) {
  if (PUBLIC.has(k)) continue
  const [method, p] = k.split(' ')
  const r = await fetch(BASE + p.replace(/:[a-zA-Z_]+/g, '00000000-0000-4000-8000-000000000000'), { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : '{}' })
  if ([401, 403, 405].includes(r.status)) ok++; else bad.push(r.status + ' ' + k)
}
for (const k of ['GET /api/muscles', 'GET /api/programs', 'GET /api/plans', 'GET /api/data']) if (!routes.has(k)) bad.push('rota não encontrada ' + k)
console.log(`sem-visitante: ${ok} rotas protegidas` + (bad.length ? `\nFALHAS:\n${bad.join('\n')}` : ''))
process.exit(bad.length ? 1 : 0)
