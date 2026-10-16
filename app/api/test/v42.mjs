// V4.2 — conta nova não liberada (ações travadas no backend), aluno do personal (senha provisória, escopo), liberação pelo admin,
// ficha nova substitui a anterior, exportação LGPD por e-mail (senha + e-mail, 1/24 h, fila).
import { get, post, login, check, summary, q, PASS } from './v3-lib.mjs'
import { pool } from '../db/pool.js'
const adm = await login('admin.e2e@avadesk.local'), p1 = await login('pro1.e2e@avadesk.local')
const terms = (await get(null, '/api/terms')).d.terms
// 1) conta nova (domínio fora do auto-desbloqueio de teste) entra travada
const em = `lock${Date.now()}@lock.test`
const reg = await post(null, '/api/auth/register', { name: 'Conta Travada', email: em, password: PASS, accept_terms: true, terms_version: terms.version })
const t = reg.d.token
check(reg.s === 200 && reg.d.user.account_type === 'normal', 'cadastro aberto: conta normal criada')
check((await get(t, '/api/guided/programs')).s === 200, 'conta não liberada VÊ o catálogo')
await post(t, '/api/guided/onboarding', { objetivo: 'hypertrophy', nivel: 'beginner', local: 'gym', dias: 3, minutos: 45, restricoes: [] })
const prog = (await get(t, '/api/guided/programs')).d.programs[0]
let r = await post(t, '/api/guided/start', { program_id: prog.id })
check(r.s === 403 && r.d.code === 'ACCESS_LOCKED', 'conta não liberada não inicia programa (backend)')
check((await post(t, '/api/posts', { body: 'oi' })).s === 403, 'conta não liberada não publica')
check((await post(t, '/api/me/theme', { theme: 'dark' })).s === 200, 'preferências continuam liberadas')
r = await post(t, '/api/me/unlock-request', { reason: 'quero treinar' })
check(r.s === 201, 'pede liberação'); const rid = r.d.id
check((await post(t, '/api/me/unlock-request', {})).s === 409, 'um pedido aberto por vez')
check((await post(p1, '/api/adm/access/decide', { id: rid, action: 'aprovar' })).s === 403, 'só admin decide')
const lst = (await get(adm, '/api/adm/access')).d
check(lst.requests.some(x => x.id === rid) && lst.locked_users.some(x => x.email === em), 'admin vê pedido e contas travadas')
check((await post(adm, '/api/adm/access/decide', { id: rid, action: 'aprovar', note: 'ok' })).s === 200, 'admin aprova')
check((await post(t, '/api/guided/start', { program_id: prog.id })).s === 200, 'liberada: inicia programa')
const uid = reg.d.user.id
check((await post(adm, '/api/adm/access/set', { user_id: uid, unlocked: false, note: 'teste' })).s === 200 && (await post(t, '/api/posts', { body: 'oi' })).s === 403, 'admin bloqueia de novo')
await post(adm, '/api/adm/access/set', { user_id: uid, unlocked: true })
// 2) personal cria aluno
const ce = `cli${Date.now()}@lock.test`
r = await post(p1, '/api/pro/clients', { name: 'Cliente do Personal', email: ce })
check(r.s === 201 && r.d.email_queued && !r.d.temp_password, 'personal cadastra aluno e enfileira link sem expor senha')
const cid = r.d.id
check((await post(p1, '/api/pro/clients', { name: 'Xavier Duplicado', email: ce })).s === 409, 'e-mail repetido recusado')
const reset = (await q("select action_path from email_outbox where ref=$1 and kind='primeiro_acesso' order by id desc limit 1", [cid])).rows[0]
r = await post(null, '/api/auth/reset', { token: reset.action_path.split('t=')[1], password: 'NovaSenha-123' })
check(r.s === 200, 'aluno define senha pelo link de primeiro acesso')
let lg = await post(null, '/api/auth/login', { email: ce, password: 'NovaSenha-123' })
let ct = lg.d.token
check(lg.s === 200 && !lg.d.user.must_change_password && lg.d.user.account_type === 'personal_client' && lg.d.user.client_locked, 'conta do personal acessa após definir senha')
await post(ct, '/api/terms/accept', { version: terms.version })
check((await get(ct, '/api/guided/programs')).d.code === 'CLIENT_SCOPE', 'aluno do personal não vê o catálogo do sistema')
check((await post(ct, '/api/guided/start', { program_id: prog.id })).s === 403, 'aluno do personal não inicia programa do sistema')
// fichas: nova substitui a anterior
const ex = (await q('select id from exercises limit 1')).rows[0].id
const f1 = (await post(p1, '/api/pro/plans', { title: 'Ficha A', student_id: cid, exercises: [{ exercise_id: ex, sets: 3, reps: '10' }] })).d.id
const f2 = (await post(p1, '/api/pro/plans', { title: 'Ficha B', student_id: cid, exercises: [{ exercise_id: ex, sets: 3, reps: '12' }] })).d.id
const care = (await get(ct, '/api/care')).d
check(care.plans.length === 1 && care.plans[0].id === f2, 'ficha nova vira a única ativa')
check(care.plan_history.some(p => p.id === f1 && p.superseded_by === f2), 'ficha antiga aparece no histórico')
check((await post(ct, '/api/guided/sessions/start', { client_id: 'v42a' + Date.now(), pro_plan_id: f1, workout_name: 'x' })).s >= 400, 'não inicia treino em ficha antiga')
check((await post(ct, '/api/guided/sessions/start', { client_id: 'v42b' + Date.now(), pro_plan_id: f2, workout_name: 'x' })).s === 201, 'aluno do personal treina a ficha ativa')
check((await get(ct, '/api/plan?id=' + f1)).s === 200, 'ficha antiga continua legível')
check((await get(p1, '/api/pro/clients')).d.clients.some(c => c.id === cid), 'personal lista seus alunos criados')
// 3) LGPD por e-mail
check((await get(ct, '/api/me/export')).s === 404, 'download direto continua desligado')
r = await post(ct, '/api/me/export-request', { password: 'errada', email: ce })
check(r.s === 400, 'exportação exige reconfirmar a senha')
r = await post(ct, '/api/me/export-request', { password: 'NovaSenha-123', email: 'outro@x.com' })
check(r.s === 400, 'exportação exige o e-mail da conta')
r = await post(ct, '/api/me/export-request', { password: 'NovaSenha-123', email: ce })
check(r.s === 202, 'pedido de exportação na fila')
const ob = (await q(`select o.status,o.to_email,o.attachment from data_export_requests d join email_outbox o on o.id=d.outbox_id where d.id=$1`, [r.d.id])).rows[0]
check(ob.to_email === ce && JSON.parse(ob.attachment).conta.email === ce && ['pendente', 'enviado', 'enviando', 'erro'].includes(ob.status), 'e-mail com o arquivo entrou na fila do Postgres')
check(!ob.attachment.includes('password_hash'), 'arquivo sem segredos')
check((await post(ct, '/api/me/export-request', { password: 'NovaSenha-123', email: ce })).s === 429, 'limite de 1 pedido a cada 24 h')
check((await q(`select count(*)::int n from audit_log where actor_id=$1 and action like 'lgpd.%'`, [cid])).rows[0].n >= 2, 'auditoria registrada')
await pool.end(); process.exit(summary() ? 1 : 0)
