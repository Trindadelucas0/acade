// SOMENTE DESENVOLVIMENTO LOCAL: cria/atualiza usuários fixos de teste (admin, 2 profissionais) para os smoke tests.
// Senha via E2E_PASSWORD (padrão: e2e-Avadesk-2026). Não rode em produção.
import '../env.js'
import bcrypt from 'bcryptjs'
import { q, pool } from '../db/pool.js'
if (process.env.NODE_ENV === 'production') { console.error('não rode em produção'); process.exit(1) }
const pass = process.env.E2E_PASSWORD || 'e2e-Avadesk-2026'
const t = (await q(`select id from tenants where slug=$1`, [process.env.DEFAULT_TENANT || 'avadesk'])).rows[0].id
const hash = await bcrypt.hash(pass, 10)
for (const [email, name, roles] of [['admin.e2e@avadesk.local', 'Admin E2E', ['admin']], ['pro1.e2e@avadesk.local', 'Profa. Ana E2E', ['profissional']], ['pro2.e2e@avadesk.local', 'Prof. Bruno E2E', ['profissional']]]) {
  const u = (await q(`insert into users(tenant_id,name,email,password_hash,status) values($1,$2,$3,$4,'ativo') on conflict (lower(email)) do update set password_hash=excluded.password_hash, status='ativo' returning id`, [t, name, email, hash])).rows[0]
  for (const r of roles) await q('insert into user_roles values($1,$2,$3) on conflict do nothing', [u.id, t, r])
  // contas de teste já aceitaram a versão vigente dos termos
  await q(`insert into term_acceptances(user_id,version) select $1, version from terms_versions on conflict do nothing`, [u.id])
  if (roles.includes('profissional')) await q(`insert into professional_profiles(user_id,tenant_id,display_name,specialties) values($1,$2,$3,$4) on conflict (user_id) do nothing`, [u.id, t, name, ['Musculação']])
}
console.log('usuários e2e prontos'); await pool.end()
