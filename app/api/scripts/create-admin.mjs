// Cria o primeiro administrador (ou outro admin). Uso: npm run create-admin
// Pergunta e-mail, nome e senha (mín. 10 caracteres). A conta nasce ativa, só com o papel admin
// (contas separadas: admin não é aluno nem profissional) e com o aceite da versão vigente dos termos.
import '../env.js'
import readline from 'node:readline'
import bcrypt from 'bcryptjs'
import { q, pool } from '../db/pool.js'
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (s, hide) => new Promise(r => {
  if (!hide) return rl.question(s, a => r(a.trim()))
  process.stdout.write(s); const w = rl._writeToOutput; rl._writeToOutput = () => {}
  rl.question('', a => { rl._writeToOutput = w; process.stdout.write('\n'); r(a) })
})
try {
  const t = (await q(`select id, name from tenants where slug=$1`, [process.env.DEFAULT_TENANT || 'avadesk'])).rows[0]
  if (!t) throw new Error('tenant não encontrado: rode node db/migrate.js primeiro')
  const admins = +(await q(`select count(*) from user_roles where role_id='admin'`)).rows[0].count
  console.log(`Tenant ${t.name}. Administradores existentes: ${admins}.`)
  const email = (await ask('E-mail do administrador: ')).toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('e-mail inválido')
  if ((await q(`select 1 from users where lower(email)=$1`, [email])).rowCount) throw new Error('já existe uma conta com esse e-mail')
  const name = (await ask('Nome: ')) || 'Administrador'
  const p1 = await ask('Senha (mín. 10): ', true); const p2 = await ask('Repita a senha: ', true)
  if (p1.length < 10) throw new Error('senha curta'); if (p1 !== p2) throw new Error('as senhas não conferem')
  const u = (await q(`insert into users(tenant_id,name,email,password_hash,status) values($1,$2,$3,$4,'ativo') returning id`, [t.id, name, email, await bcrypt.hash(p1, 12)])).rows[0]
  await q(`insert into user_roles values($1,$2,'admin') on conflict do nothing`, [u.id, t.id])
  await q(`insert into term_acceptances(user_id,version) select $1, version from terms_versions on conflict do nothing`, [u.id])
  await q(`insert into audit_log(tenant_id,actor_id,action,entity,entity_id,data) values($1,$2,'admin.criado_cli','user',$2,'{}')`, [t.id, u.id]).catch(() => {})
  console.log(`Administrador criado: ${email}. Entre em http://localhost:4449 com esse e-mail e senha.`)
} catch (e) { console.error('erro:', e.message); process.exitCode = 1 }
finally { rl.close(); await pool.end() }
