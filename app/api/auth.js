// Autenticação email+senha (bcrypt) com JWT (cookie httpOnly "avagym_token" ou Authorization: Bearer)
// + middlewares requireAuth / requireRole / escopo por tenant + rotas de catálogo (músculos, exercícios, programas).
import './env.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import { q } from './db/pool.js'
import { currentTerms, acceptTerms, termsStatus } from './lgpd.js'

const SECRET = process.env.JWT_SECRET
if (!SECRET || SECRET.length < 32) console.warn('[auth] JWT_SECRET ausente ou curto — defina em app/api/.env')
const TTL_H = +(process.env.JWT_TTL_HOURS || 168)
const SECURE = /^https:/i.test(process.env.ORIGIN || '') ? ' Secure;' : ''
const COOKIE = 'avagym_token'
export const tokenCookie = tok => `${COOKIE}=${tok}; Path=/; Max-Age=${TTL_H * 3600}; HttpOnly;${SECURE} SameSite=Lax`
export const clearTokenCookie = `${COOKIE}=; Path=/; Max-Age=0; HttpOnly;${SECURE} SameSite=Lax`
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function readToken(req) {
  const h = req.headers.authorization || ''
  if (/^Bearer\s+/i.test(h)) return h.replace(/^Bearer\s+/i, '').trim()
  const m = /(?:^|;\s*)avagym_token=([^;]+)/.exec(req.headers.cookie || '')
  return m ? m[1] : null
}
// Resolve o usuário do JWT (ou null). Confere no banco se continua ativo.
export async function authUser(req) {
  const tok = readToken(req); if (!tok || !SECRET) return null
  let p; try { p = jwt.verify(tok, SECRET) } catch { return null }
  const u = await loadUser(p.sub)
  // V4 F7: "sair de todos os dispositivos" / troca de senha sobem token_version; tokens antigos param de valer
  if (u && (p.tv || 0) !== (u.token_version || 0)) return null
  return u
}
async function loadUser(id) {
  const r = await q(`select u.id,u.name,u.email,u.tenant_id,u.disabled_at,u.status,u.active_context,u.token_version,(select pp.verification_status from professional_profiles pp where pp.user_id=u.id) verification,t.slug tenant_slug,t.name tenant_name,
      coalesce(array_agg(ur.role_id) filter (where ur.role_id is not null),'{}') roles
    from users u join tenants t on t.id=u.tenant_id left join user_roles ur on ur.user_id=u.id and ur.tenant_id=u.tenant_id
    where u.id=$1 group by u.id,t.slug,t.name`, [id])
  const u = r.rows[0]
  if (!u || u.disabled_at || u.status === 'bloqueado') return null
  return u
}
// Middlewares estilo "guard": retornam o usuário ou respondem 401/403 e retornam null.
// Conta "pendente" entra no app, mas as funcionalidades ficam travadas até a liberação (APP FLOW / decisão 4).
export async function requireAuth(req, res, json, opts) {
  const u = await authUser(req)
  if (!u) { json(res, 401, { error: 'Não autenticado' }); return null }
  if (u.status !== 'ativo' && !(opts && opts.allowPending)) { json(res, 403, { pending: true, error: 'Esta conta não está ativa. Fale com o suporte.' }); return null }
  req.user = u; req.tenantId = u.tenant_id
  return u
}
export function requireRole(...roles) {
  return async (req, res, json) => {
    const u = await requireAuth(req, res, json); if (!u) return null
    if (!u.roles.some(r => roles.includes(r))) { json(res, 403, { error: 'Sem permissão', code: 'PERMISSION_DENIED' }); return null }
    return u
  }
}
// Registro de auditoria (quem, o quê, quando). Nunca derruba a operação principal.
export async function audit(tenantId, actorId, action, entity, entityId, data) {
  try { await q('insert into audit_log(tenant_id,actor_id,action,entity,entity_id,data) values($1,$2,$3,$4,$5,$6)', [tenantId, actorId, action, entity, entityId == null ? null : String(entityId), data || null]) }
  catch (e) { console.error('[audit]', e.message) }
}
// Filtro padrão para tabelas com catálogo global + dados do tenant.
export const tenantScope = (alias, idx) => `(${alias}.tenant_id is null or ${alias}.tenant_id = $${idx})`

// V3: contexto de navegação ativo (aluno | profissional | admin) — o escolhido, se a conta tiver a capacidade
export const contextOf = u => (u.active_context && u.roles.includes(u.active_context)) ? u.active_context
  : u.roles.includes('admin') ? 'admin' : u.roles.includes('aluno') ? 'aluno' : u.roles.includes('profissional') ? 'profissional' : 'aluno'
const sign = u => jwt.sign({ sub: u.id, tid: u.tenant_id, roles: u.roles, tv: u.token_version || 0 }, SECRET, { expiresIn: TTL_H + 'h' })
export const pub = u => ({ id: u.id, name: u.name, email: u.email, roles: u.roles, admin: u.roles.includes('admin'), pro: u.roles.includes('profissional'), status: u.status,
  capacities: u.roles.filter(r => r === 'aluno' || r === 'profissional'), context: contextOf(u), verification: u.verification || null,
  tenant: { id: u.tenant_id, slug: u.tenant_slug, name: u.tenant_name } })

export function authRoutes({ json, readBody, bridge, clearCookies }) {
  const login = async (res, id) => {
    const u = await loadUser(id)
    const tok = sign(u)
    const extra = bridge ? bridge(u) : []
    json(res, 200, { user: { ...pub(u), ...(await termsStatus(u.id)) }, token: tok }, { 'Set-Cookie': [tokenCookie(tok), ...extra] })
  }

  return {
    'POST /api/auth/register': async (req, res) => {
      const b = await readBody(req)
      const name = String(b.name || '').trim(), email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '')
      // V3: "Quero treinar" (aluno) ou "Sou profissional" (aluno + profissional na MESMA identidade, verificação pendente)
      const intent = b.intent === 'profissional' ? 'profissional' : 'aluno'
      const errors = {}
      if (name.length < 2) errors.name = 'Informe seu nome'
      if (!EMAIL_RE.test(email)) errors.email = 'E-mail inválido'
      if (password.length < 8) errors.password = 'A senha deve ter pelo menos 8 caracteres'
      const terms = await currentTerms()
      if (terms && (b.accept_terms !== true || b.terms_version !== terms.version)) errors.terms = 'É preciso aceitar os termos de uso (versão ' + terms.version + ')'
      if (Object.keys(errors).length) return json(res, 400, { error: Object.values(errors)[0], errors })
      const t = await q('select id from tenants where slug=$1 and active', [String(b.tenant || process.env.DEFAULT_TENANT || 'avadesk')])
      if (!t.rowCount) return json(res, 400, { error: 'Academia não encontrada' })
      if ((await q('select 1 from users where lower(email)=$1', [email])).rowCount) return json(res, 409, { error: 'Este e-mail já tem conta. Quer entrar ou recuperar a senha?', code: 'EMAIL_EXISTS', errors: { email: 'Este e-mail já tem conta' } })
      const hash = await bcrypt.hash(password, 12)
      let u
      try { u = await q('insert into users(tenant_id,name,email,password_hash) values($1,$2,$3,$4) returning id', [t.rows[0].id, name.slice(0, 80), email, hash]) }
      catch (e) { if (e.code === '23505') return json(res, 409, { error: 'Este e-mail já tem conta. Quer entrar ou recuperar a senha?', code: 'EMAIL_EXISTS', errors: { email: 'Este e-mail já tem conta' } }); throw e }   // corrida: o índice único decide
      await q(`insert into user_roles values($1,$2,'aluno')`, [u.rows[0].id, t.rows[0].id])
      if (intent === 'profissional') {
        await q(`insert into user_roles values($1,$2,'profissional') on conflict do nothing`, [u.rows[0].id, t.rows[0].id])
        await q(`insert into professional_profiles(user_id,tenant_id,display_name) values($1,$2,$3) on conflict do nothing`, [u.rows[0].id, t.rows[0].id, name.slice(0, 80)])
        await q(`update users set active_context='profissional' where id=$1`, [u.rows[0].id])
      }
      // V3 (decisão Lucas 15/10): SaaS aberto — conta nasce ativa, sem aprovação do admin (admin ainda pode bloquear)
      if (terms) await acceptTerms(u.rows[0].id, terms.version, req)
      await audit(t.rows[0].id, u.rows[0].id, 'conta.cadastro', 'user', u.rows[0].id, { intent, termos: terms && terms.version })
      await login(res, u.rows[0].id)
    },
    'POST /api/auth/login': async (req, res) => {
      const b = await readBody(req)
      const email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '')
      if (!email || !password) return json(res, 400, { error: 'Informe e-mail e senha' })
      const r = await q('select id,password_hash,disabled_at,status from users where lower(email)=$1', [email])
      const row = r.rows[0]
      const ok = row && row.password_hash && await bcrypt.compare(password, row.password_hash)
      if (!ok) return json(res, 401, { error: 'E-mail ou senha incorretos' })
      if (row.disabled_at || row.status === 'bloqueado') return json(res, 403, { error: 'Conta desativada' })
      await q('update users set last_seen_at=now() where id=$1', [row.id])
      await login(res, row.id)
    },
    'POST /api/auth/logout': async (req, res) => json(res, 200, { ok: true }, { 'Set-Cookie': [clearTokenCookie, ...(clearCookies || [])] }),
    // V4 F7: encerra a sessão em todos os aparelhos (inclusive este)
    'POST /api/auth/logout-all': async (req, res) => {
      const u = await requireAuth(req, res, json, { allowPending: true }); if (!u) return
      await q('update users set token_version=token_version+1 where id=$1', [u.id])
      await audit(u.tenant_id, u.id, 'sessao.encerrada_todas', 'user', u.id)
      json(res, 200, { ok: true }, { 'Set-Cookie': [clearTokenCookie, ...(clearCookies || [])] })
    },
    // V4 F7: troca de senha logado (exige a senha atual); encerra os outros aparelhos e devolve token novo para este
    'POST /api/auth/password': async (req, res) => {
      const u = await requireAuth(req, res, json, { allowPending: true }); if (!u) return
      const b = await readBody(req), pw = String(b.new_password || '')
      const row = (await q('select password_hash from users where id=$1', [u.id])).rows[0]
      if (!row?.password_hash || !(await bcrypt.compare(String(b.current_password || ''), row.password_hash))) return json(res, 400, { error: 'Senha atual incorreta', errors: { current_password: 'Senha atual incorreta' } })
      if (pw.length < 8) return json(res, 400, { error: 'A nova senha deve ter pelo menos 8 caracteres', errors: { new_password: 'Mínimo de 8 caracteres' } })
      await q('update users set password_hash=$2, token_version=token_version+1 where id=$1', [u.id, await bcrypt.hash(pw, 12)])
      await audit(u.tenant_id, u.id, 'senha.alterada', 'user', u.id)
      await login(res, u.id)
    },
    'GET /api/auth/me': async (req, res) => {
      const u = await requireAuth(req, res, json, { allowPending: true }); if (!u) return
      json(res, 200, { user: { ...pub(u), ...(await termsStatus(u.id)) } })
    },
    // recuperação: o pedido avisa a administração, que gera um link de uso único (24 h). Resposta sempre genérica.
    'POST /api/auth/forgot': async (req, res) => {
      const b = await readBody(req), email = String(b.email || '').trim().toLowerCase()
      const r = EMAIL_RE.test(email) ? (await q('select id, tenant_id, name from users where lower(email)=$1 and disabled_at is null', [email])).rows[0] : null
      if (r) {
        await audit(r.tenant_id, r.id, 'senha.recuperacao_pedida', 'user', r.id)
        const admins = await q(`select user_id from user_roles where tenant_id=$1 and role_id='admin'`, [r.tenant_id])
        for (const a of admins.rows) await q('insert into notifications(user_id,kind,title,body,link) values($1,$2,$3,$4,$5)', [a.user_id, 'senha', 'Pedido de recuperação de senha', `${r.name} (${email})`, '/admin/painel?tab=alunos'])
      }
      json(res, 200, { ok: true, message: 'Se o e-mail estiver cadastrado, a administração vai enviar a você um link para criar uma nova senha.' })
    },
    'POST /api/auth/reset': async (req, res) => {
      const b = await readBody(req), pw = String(b.password || '')
      if (pw.length < 8) return json(res, 400, { error: 'A senha deve ter pelo menos 8 caracteres' })
      const h = crypto.createHash('sha256').update(String(b.token || '')).digest('hex')
      const r = (await q('select * from password_resets where token_hash=$1 and used_at is null and expires_at > now()', [h])).rows[0]
      if (!r) return json(res, 400, { error: 'Link inválido ou expirado. Peça um novo à administração.' })
      await q('update users set password_hash=$2, token_version=token_version+1 where id=$1', [r.user_id, await bcrypt.hash(pw, 12)])
      await q('update password_resets set used_at=now() where id=$1', [r.id])
      const t = (await q('select tenant_id from users where id=$1', [r.user_id])).rows[0]
      await audit(t.tenant_id, r.user_id, 'senha.redefinida', 'user', r.user_id)
      json(res, 200, { ok: true })
    },
    'POST /api/adm/users/reset-link': async (req, res) => {
      const u = await requireRole('admin')(req, res, json); if (!u) return
      const b = await readBody(req)
      const t = (await q('select id from users where id=$1 and tenant_id=$2', [b.id, u.tenant_id])).rows[0]
      if (!t) return json(res, 404, { error: 'Usuário não encontrado' })
      const tok = crypto.randomBytes(24).toString('base64url')
      await q(`insert into password_resets(user_id,token_hash,expires_at,created_by) values($1,$2,now()+interval '24 hours',$3)`, [t.id, crypto.createHash('sha256').update(tok).digest('hex'), u.id])
      await audit(u.tenant_id, u.id, 'senha.link_gerado', 'user', t.id)
      json(res, 200, { link: (process.env.ORIGIN || 'http://localhost:4449') + '/#/redefinir?t=' + tok, expires_hours: 24 })
    },

    // ===== catálogo =====
    'GET /api/muscles': async (req, res) => {
      if (!await requireAuth(req, res, json)) return   // cat�logo s� para logados (sem modo visitante)
      const [g, m] = await Promise.all([
        q('select id,name_pt,is_training from muscle_groups order by position'),
        q('select id,name_pt,name_en,group_id,mesh_ids from muscles order by name_pt')])
      json(res, 200, { groups: g.rows, muscles: m.rows }, { 'Cache-Control': 'public, max-age=300' })
    },
    'GET /api/muscles/exercises': async (req, res) => {
      const url = new URL(req.url, 'http://x')
      const muscle = url.searchParams.get('muscle') || '', group = url.searchParams.get('group') || ''
      const u = await requireAuth(req, res, json); if (!u) return; const tid = u.tenant_id
      const r = await q(`select e.id,e.name_pt,e.level,eq.name_pt equipment,
          max(case when em.muscle_id=$1 then 3 when eg.group_id=$2 and eg.role='primary' then 2 when eg.group_id=$2 then 1 else 0 end) score
        from exercises e left join equipment eq on eq.id=e.equipment_id
        left join exercise_muscles em on em.exercise_id=e.id left join exercise_groups eg on eg.exercise_id=e.id
        where ${tenantScope('e', 3)} and (em.muscle_id=$1 or eg.group_id=$2)
        group by e.id,eq.name_pt order by score desc, e.name_pt limit 30`, [muscle, group, tid])
      json(res, 200, { exercises: r.rows })
    },
    'GET /api/programs': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return; const tid = u.tenant_id
      const r = await q(`select p.id,p.slug,p.title,p.description,p.goal,p.level,p.location,p.weeks,p.days_per_week,p.minutes,p.is_rehab,p.tags,
        (select json_agg(json_build_object('name',w.name,'focus',w.focus,'exercises',(select json_agg(json_build_object('id',x.exercise_id,'name',e.name_pt,'sets',x.sets,'reps_min',x.reps_min,'reps_max',x.reps_max,'rest_sec',x.rest_sec,'duration_sec',x.duration_sec) order by x.position)
           from program_workout_exercises x join exercises e on e.id=x.exercise_id where x.program_workout_id=w.id)) order by w.position) from program_workouts w where w.program_id=p.id) workouts
        from programs p where (p.tenant_id is null and p.visibility='public') or p.tenant_id=$1 order by p.is_rehab, p.title`, [tid])
      json(res, 200, { programs: r.rows })
    },
    'GET /api/admin/tenant-users': async (req, res) => {
      const u = await requireRole('admin')(req, res, json); if (!u) return
      const r = await q(`select u.id,u.name,u.email,u.created_at,array_agg(ur.role_id) roles from users u left join user_roles ur on ur.user_id=u.id
        where u.tenant_id=$1 group by u.id order by u.created_at`, [u.tenant_id])
      json(res, 200, { users: r.rows })
    }
  }
}
