// AVAGYM — Treino guiado: onboarding, recomendação determinística, programa ativo, sessões e progresso.
// Todas as rotas exigem login (requireAuth) e são isoladas por tenant (tenantScope / user_id).
import { q } from './db/pool.js'
import { requireAuth, requireRole, tenantScope } from './auth.js'
// conta profissional não tem treino pessoal (contas separadas); admin e aluno seguem normalmente
async function requireTrainee(req, res, json) {
  const u = await requireAuth(req, res, json); if (!u) return null
  if (u.roles.includes('profissional') && !u.roles.includes('aluno') && !u.roles.includes('admin')) { json(res, 403, { error: 'Conta profissional não registra treino pessoal. Use sua conta de aluno separada.', pro_account: true }); return null }
  return u
}

const GOALS = ['hypertrophy', 'weight_loss', 'strength', 'conditioning', 'mobility', 'home', 'rehab']
const LEVELS = ['beginner', 'intermediate', 'advanced']
const LOCS = ['gym', 'home', 'home_noequip']
const RESTR = ['knee', 'lumbar', 'shoulder', 'other']
const STATUS = ['rascunho', 'revisao', 'publicado', 'arquivado']
const GOAL_PT = { hypertrophy: 'ganhar massa', weight_loss: 'emagrecer', strength: 'ganhar força', conditioning: 'melhorar o condicionamento', mobility: 'mobilidade', home: 'treinar em casa', rehab: 'reabilitação' }
const LEVEL_PT = { beginner: 'iniciante', intermediate: 'intermediário', advanced: 'avançado' }
const LOC_PT = { gym: 'academia', home: 'em casa', home_noequip: 'sem equipamento' }
const RESTR_PT = { knee: 'joelho', lumbar: 'lombar', shoulder: 'ombro', other: 'outra' }
const RESTR_NA = { knee: 'no joelho', lumbar: 'na lombar', shoulder: 'no ombro' }
const RESTR_TAG = { knee: 'joelho', lumbar: 'lombar', shoulder: 'ombro' }
const RELATED = { weight_loss: ['conditioning'], conditioning: ['weight_loss'], home: [], hypertrophy: ['strength'], strength: ['hypertrophy'], mobility: ['rehab'], rehab: ['mobility'] }

const qs = req => new URL(req.url, 'http://x').searchParams
const isUuid = s => /^[0-9a-f-]{36}$/i.test(String(s || ''))

// ---------- recomendação (pura, determinística) ----------
// programs: [{ id, goal, level, location, days_per_week, minutes, minutes_max, is_rehab, tags, caution: {code:n}, avoid: [codes] }]
export function scorePrograms(programs, p) {
  const strict = rank(programs, p, false)
  if (strict.length >= 3) return strict
  const seen = new Set(strict.map(x => x.id))
  return strict.concat(rank(programs, p, true).filter(x => !seen.has(x.id)).map(x => ({ ...x, score: x.score - 40 })))
}
function rank(programs, p, relaxed) {
  const ul = LEVELS.indexOf(p.nivel)
  const restr = (p.restricoes || []).filter(r => r !== 'other')
  const out = []
  for (const pr of programs) {
    const why = []; let s = 0
    // restrições: exclui se houver exercício contraindicado ("evitar") ou muitos "com cuidado"
    if (restr.some(r => (pr.avoid || []).includes(r))) continue
    if (restr.some(r => ((pr.caution || {})[r] || 0) >= 5)) continue
    // objetivo
    if (pr.goal === p.objetivo) { s += 50; why.push(`Feito para ${GOAL_PT[p.objetivo]}`) }
    else if ((RELATED[p.objetivo] || []).includes(pr.goal)) { s += 18; why.push(`Ajuda a ${GOAL_PT[p.objetivo]}`) }
    else if (p.objetivo === 'home' && pr.location !== 'gym') { s += 30; why.push('Dá para fazer em casa') }
    else if (!(pr.is_rehab && restr.length) && !(relaxed && !pr.is_rehab)) continue
    else if (relaxed && !pr.is_rehab) why.push('Combina com o seu local, nível e tempo')
    // reabilitação: só quando o objetivo pede ou há restrição correspondente
    if (pr.is_rehab) {
      const hit = restr.find(r => (pr.tags || []).includes(RESTR_TAG[r]))
      if (hit) { s += p.objetivo === 'rehab' ? 30 : 12; why.push(`Pensado para quem sente dor ${RESTR_NA[hit]}`) }
      else if (p.objetivo !== 'rehab') continue
      else if (restr.length) s -= 15
    }
    // nível (nunca acima do nível do aluno)
    const pl = LEVELS.indexOf(pr.level)
    if (pl > ul) continue
    if (pl === ul) { s += 20; why.push(`No seu nível (${LEVEL_PT[p.nivel]})`) }
    else { s += 8; why.push('Começa leve e evolui com você') }
    // local
    const feasible = pr.is_rehab || pr.location === 'home_noequip' || (pr.location === 'home' && p.local !== 'home_noequip') || (pr.location === 'gym' && p.local === 'gym')
    if (!feasible) continue
    if (pr.location === p.local) { s += 15; why.push(p.local === 'gym' ? 'Para fazer na academia' : p.local === 'home' ? 'Para fazer em casa' : 'Não precisa de equipamento') }
    else s += 5
    // frequência
    const dd = Math.abs((pr.days_per_week || 3) - p.dias)
    if (dd === 0) { s += 15; why.push(`${p.dias} treinos por semana, como você quer`) }
    else if (dd === 1) { s += 8; why.push(`${pr.days_per_week} treinos por semana`) }
    else s -= 4 * dd
    // tempo
    const pm = pr.minutes || 45
    if (pm <= p.minutos) { s += 10; why.push(`Cabe nos seus ${p.minutos} minutos`) }
    else if (pm - p.minutos <= 15) s += 2
    else s -= 12
    // cuidado com restrições
    for (const r of restr) { const n = (pr.caution || {})[r] || 0; if (n) { s -= 3 * n; why.push(`${n} exercício(s) pedem cuidado ${RESTR_NA[r]} — vamos avisar na hora`) } }
    out.push({ id: pr.id, score: s, why: why.slice(0, 4) })
  }
  return out.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)))
}

// ---------- progressão segura ----------
// last: séries da última vez [{weight, reps}], alvo {reps_min, reps_max, duration_sec}
export function suggestNext(last, ex) {
  const timed = !ex.reps_max && ex.duration_sec
  const target = timed ? ex.duration_sec : (ex.reps_max || ex.reps_min || 10)
  if (!last || !last.length) return { weight: null, reps: timed ? ex.duration_sec : (ex.reps_min || ex.reps_max || 10), note: null }
  const w = Math.max(...last.map(s => +s.weight || 0))
  const allDone = last.length >= (ex.sets || 1) && last.every(s => (+s.reps || 0) >= target)
  const lastReps = Math.round(last.reduce((a, s) => a + (+s.reps || 0), 0) / last.length)
  if (timed) return allDone ? { weight: w || null, reps: Math.min(target + 10, Math.round(target * 1.5)), note: '+10 s: você completou tudo da última vez' } : { weight: w || null, reps: target, note: null }
  if (allDone && w > 0) {
    const inc = w >= 20 ? 2 : 1                         // limite: +2 kg (ou +1 kg em cargas leves)
    return { weight: Math.round((w + inc) * 2) / 2, reps: ex.reps_min || target, note: `+${inc} kg: você fez todas as repetições da última vez` }
  }
  if (allDone) return { weight: null, reps: Math.min(target + 1, (ex.reps_max || target) + 5), note: '+1 repetição: você completou tudo da última vez' }
  return { weight: w || null, reps: Math.max(lastReps, ex.reps_min || 1), note: null }
}

async function profileOf(uid) {
  const r = await q('select objetivo,nivel,local,dias,minutos,restricoes,updated_at from user_onboarding where user_id=$1', [uid])
  return r.rows[0] || null
}
async function activeOf(u) {
  const r = await q(`select up.id, up.program_id, up.start_date, up.started_at, p.title, p.weeks, p.days_per_week, p.minutes, p.minutes_max, p.goal, p.level, p.cover_url
    from user_programs up join programs p on p.id=up.program_id where up.user_id=$1 and up.tenant_id=$2 and up.status='active' order by up.started_at desc limit 1`, [u.id, u.tenant_id])
  return r.rows[0] || null
}
async function programFull(id, tid) {
  const r = await q(`select p.* from programs p where p.id=$1 and ${tenantScope('p', 2)}`, [id, tid])
  const p = r.rows[0]; if (!p) return null
  const w = await q(`select w.id,w.position,w.name,w.focus,w.day_label,
      coalesce((select json_agg(json_build_object('id',x.id,'exercise_id',x.exercise_id,'name',e.name_pt,'media',e.media_url,'equipment',eq.name_pt,
        'sets',x.sets,'reps_min',x.reps_min,'reps_max',x.reps_max,'rest_sec',x.rest_sec,'duration_sec',x.duration_sec,
        'instructions',coalesce(x.instructions,e.instructions_pt),
        'cautions',(select coalesce(json_agg(json_build_object('code',ci.restriction_code,'level',ci.level)),'[]') from exercise_contraindications ci where ci.exercise_id=e.id)) order by x.position)
        from program_workout_exercises x join exercises e on e.id=x.exercise_id left join equipment eq on eq.id=e.equipment_id where x.program_workout_id=w.id),'[]') exercises
    from program_workouts w where w.program_id=$1 order by w.position`, [id])
  p.workouts = w.rows
  const eqn = await q('select id,name_pt from equipment where id = any($1)', [p.equipment || []])
  p.equipment_pt = eqn.rows.map(r => r.name_pt)
  const mg = await q('select id,name_pt from muscle_groups where id = any($1) order by position', [p.muscles || []])
  p.muscles_pt = mg.rows.map(r => r.name_pt)
  return p
}
const LIST_SQL = `select p.id,p.slug,p.title,p.description,p.goal,p.level,p.location,p.weeks,p.days_per_week,p.minutes,p.minutes_max,p.is_rehab,p.tags,
    p.cover_url,p.author_name,p.status,p.version,p.equipment,p.muscles,p.contraindications avoid,
    (select count(*) from program_workouts w where w.program_id=p.id)::int workouts_count,
    (select coalesce(json_object_agg(c.code,c.n),'{}') from (select ci.restriction_code code, count(distinct x.exercise_id) n from program_workouts w
       join program_workout_exercises x on x.program_workout_id=w.id join exercise_contraindications ci on ci.exercise_id=x.exercise_id and ci.level='caution'
       where w.program_id=p.id group by ci.restriction_code) c) caution
  from programs p where ((p.tenant_id is null and p.visibility='public') or p.tenant_id=$1)`

async function sessionsDoneIn(upId) {
  return +(await q(`select count(*) from sessions where user_program_id=$1 and status='done'`, [upId])).rows[0].count
}
function weekStart(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); return x }

export function guidedRoutes({ json, readBody }) {
  return {
    'GET /api/guided/state': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const [profile, active] = await Promise.all([profileOf(u.id), activeOf(u)])
      const ws = weekStart()
      const week = (await q(`select started_at, workout_name from sessions where user_id=$1 and tenant_id=$2 and status='done' and started_at >= $3 order by started_at`, [u.id, u.tenant_id, ws])).rows
      const days = (await q(`select distinct (started_at at time zone 'America/Sao_Paulo')::date d from sessions where user_id=$1 and status='done' order by d desc limit 120`, [u.id])).rows.map(r => r.d)
      // sequência: semanas consecutivas (incluindo a atual) com pelo menos 1 treino
      const wk = new Set(days.map(d => weekStart(d).getTime()))
      let streak = 0; for (let t = ws.getTime(); wk.has(t); t -= 7 * 864e5) streak++
      if (!wk.has(ws.getTime())) { streak = 0; for (let t = ws.getTime() - 7 * 864e5; wk.has(t); t -= 7 * 864e5) streak++ }
      let done = 0
      if (active) done = await sessionsDoneIn(active.id)
      json(res, 200, { profile, active: active && { ...active, sessions_done: done, week_index: Math.min(active.weeks || 1, Math.floor((Date.now() - new Date(active.started_at)) / (7 * 864e5)) + 1) }, week: { done: week.length, target: active ? active.days_per_week : (profile ? profile.dias : 3), sessions: week }, streak_weeks: streak })
    },
    'POST /api/guided/onboarding': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const b = await readBody(req)
      const p = { objetivo: b.objetivo, nivel: b.nivel, local: b.local, dias: +b.dias, minutos: +b.minutos, restricoes: (Array.isArray(b.restricoes) ? b.restricoes : []).filter(r => RESTR.includes(r)) }
      if (!GOALS.includes(p.objetivo) || !LEVELS.includes(p.nivel) || !LOCS.includes(p.local) || !(p.dias >= 2 && p.dias <= 6) || ![20, 30, 45, 60].includes(p.minutos))
        return json(res, 400, { error: 'Respostas inválidas' })
      await q(`insert into user_onboarding(user_id,tenant_id,objetivo,nivel,local,dias,minutos,restricoes) values($1,$2,$3,$4,$5,$6,$7,$8)
        on conflict (user_id) do update set objetivo=excluded.objetivo,nivel=excluded.nivel,local=excluded.local,dias=excluded.dias,minutos=excluded.minutos,restricoes=excluded.restricoes,updated_at=now()`,
        [u.id, u.tenant_id, p.objetivo, p.nivel, p.local, p.dias, p.minutos, p.restricoes])
      json(res, 200, { profile: p })
    },
    'GET /api/guided/recommendations': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const p = await profileOf(u.id); if (!p) return json(res, 400, { error: 'Responda o questionário primeiro' })
      const list = (await q(LIST_SQL + ` and p.status='publicado'`, [u.tenant_id])).rows
      const ranked = scorePrograms(list, p).slice(0, 3)
      const by = new Map(list.map(x => [x.id, x]))
      const notes = []
      if ((p.restricoes || []).length && !p.restricoes.every(r => r === 'other')) notes.push('Removemos programas com exercícios que não combinam com a sua restrição.')
      if ((p.restricoes || []).length) notes.push('Se sentir dor durante o treino, pare e procure um profissional de saúde.')
      json(res, 200, { profile: p, recommendations: ranked.map(r => ({ ...by.get(r.id), score: r.score, why: r.why })), notes })
    },
    'GET /api/guided/programs': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const goal = qs(req).get('goal')
      const r = await q(LIST_SQL + ` and p.status='publicado'` + (GOALS.includes(goal) ? ` and p.goal=$2` : '') + ' order by p.is_rehab, p.goal, p.level, p.days_per_week', GOALS.includes(goal) ? [u.tenant_id, goal] : [u.tenant_id])
      json(res, 200, { programs: r.rows })
    },
    'GET /api/guided/program': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const id = qs(req).get('id'); if (!isUuid(id)) return json(res, 400, { error: 'id inválido' })
      const p = await programFull(id, u.tenant_id); if (!p) return json(res, 404, { error: 'Programa não encontrado' })
      json(res, 200, { program: p })
    },
    'POST /api/guided/start': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const b = await readBody(req); if (!isUuid(b.program_id)) return json(res, 400, { error: 'id inválido' })
      const p = await q(`select id from programs p where id=$1 and status='publicado' and ${tenantScope('p', 2)}`, [b.program_id, u.tenant_id])
      if (!p.rowCount) return json(res, 404, { error: 'Programa não encontrado' })
      await q(`update user_programs set status='switched', ended_at=now(), end_reason='trocou de programa' where user_id=$1 and status='active'`, [u.id])
      const r = await q(`insert into user_programs(tenant_id,user_id,program_id,start_date,status,started_at,schedule) values($1,$2,$3,current_date,'active',now(),'{}') returning id`, [u.tenant_id, u.id, b.program_id])
      json(res, 200, { user_program_id: r.rows[0].id })
    },
    'POST /api/guided/abandon': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const b = await readBody(req)
      await q(`update user_programs set status='abandoned', ended_at=now(), end_reason=$2 where user_id=$1 and status='active'`, [u.id, String(b.reason || '').slice(0, 200) || null])
      json(res, 200, { ok: true })
    },
    // treino de hoje = próximo na sequência do programa ativo (ou ?workout=<id> para escolher outro)
    'GET /api/guided/today': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const a = await activeOf(u); if (!a) return json(res, 200, { active: null })
      const p = await programFull(a.program_id, u.tenant_id)
      const done = await sessionsDoneIn(a.id)
      const want = qs(req).get('workout')
      const idx = p.workouts.findIndex(w => w.id === want)
      const w = p.workouts[idx >= 0 ? idx : (done % Math.max(1, p.workouts.length))]
      if (!w) return json(res, 200, { active: a, workout: null })
      const ids = w.exercises.map(e => e.exercise_id)
      const last = (await q(`select distinct on (ss.exercise_id, ss.set_index) ss.exercise_id, ss.set_index, ss.weight, ss.reps, s.started_at
        from session_sets ss join sessions s on s.id=ss.session_id
        where s.user_id=$1 and s.status='done' and ss.exercise_id = any($2)
          and s.started_at = (select max(s2.started_at) from sessions s2 join session_sets x2 on x2.session_id=s2.id where s2.user_id=$1 and s2.status='done' and x2.exercise_id=ss.exercise_id)
        order by ss.exercise_id, ss.set_index, s.started_at desc`, [u.id, ids])).rows
      const lastBy = {}; for (const r of last) (lastBy[r.exercise_id] ||= []).push({ weight: r.weight == null ? null : +r.weight, reps: r.reps })
      w.exercises = w.exercises.map(e => ({ ...e, last: lastBy[e.exercise_id] || null, suggestion: suggestNext(lastBy[e.exercise_id], e) }))
      json(res, 200, { active: { ...a, sessions_done: done }, workout: w, workouts: p.workouts.map(x => ({ id: x.id, name: x.name, day_label: x.day_label, focus: x.focus, count: x.exercises.length })), next_index: done % Math.max(1, p.workouts.length) })
    },
    // sincronização idempotente da sessão (client_id gerado no aparelho)
    'POST /api/guided/sessions': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const b = await readBody(req)
      const cid = String(b.client_id || '').slice(0, 64); if (!cid) return json(res, 400, { error: 'client_id obrigatório' })
      const sets = (Array.isArray(b.sets) ? b.sets : []).slice(0, 300)
      const ex = await q('select id,status from sessions where user_id=$1 and client_id=$2', [u.id, cid])
      if (ex.rowCount && ex.rows[0].status === 'done') return json(res, 200, { id: ex.rows[0].id, duplicate: true })
      let upId = isUuid(b.user_program_id) ? b.user_program_id : null
      if (upId && !(await q('select 1 from user_programs where id=$1 and user_id=$2', [upId, u.id])).rowCount) upId = null
      const pwId = isUuid(b.program_workout_id) && (await q('select 1 from program_workouts where id=$1', [b.program_workout_id])).rowCount ? b.program_workout_id : null
      const volume = sets.reduce((a, s) => a + (+s.weight || 0) * (+s.reps || 0), 0)
      const started = new Date(b.started_at || Date.now()), finished = b.finished_at ? new Date(b.finished_at) : null
      const status = finished ? 'done' : 'in_progress'
      const exCount = new Set(sets.map(s => s.exercise_id)).size
      const feeling = b.feeling == null ? null : Math.max(1, Math.min(5, +b.feeling | 0))
      let sid
      if (ex.rowCount) {
        sid = ex.rows[0].id
        await q(`update sessions set finished_at=$2,status=$3,feeling=$4,notes=$5,duration_sec=$6,volume_kg=$7,sets_count=$8,exercises_count=$9 where id=$1`,
          [sid, finished, status, feeling, b.notes ? String(b.notes).slice(0, 500) : null, finished ? Math.round((finished - started) / 1000) : null, volume, sets.length, exCount])
        await q('update sessions set prescribed_count=$2, pro_plan_id=$3 where id=$1', [sid, +b.prescribed_count || null, isUuid(b.pro_plan_id) ? b.pro_plan_id : null])
        await q('delete from session_sets where session_id=$1', [sid])
      } else {
        sid = (await q(`insert into sessions(tenant_id,user_id,started_at,finished_at,status,feeling,notes,client_id,user_program_id,program_workout_id,workout_name,duration_sec,volume_kg,sets_count,exercises_count)
          values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning id`,
          [u.tenant_id, u.id, started, finished, status, feeling, b.notes ? String(b.notes).slice(0, 500) : null, cid, upId, pwId, String(b.workout_name || 'Treino').slice(0, 120),
           finished ? Math.round((finished - started) / 1000) : null, volume, sets.length, exCount])).rows[0].id
        await q('update sessions set prescribed_count=$2, pro_plan_id=$3 where id=$1', [sid, +b.prescribed_count || null, isUuid(b.pro_plan_id) ? b.pro_plan_id : null])
      }
      const known = new Set((await q('select id from exercises where id = any($1)', [sets.map(s => String(s.exercise_id))])).rows.map(r => r.id))
      for (const s of sets) if (known.has(String(s.exercise_id)))
        await q('insert into session_sets(session_id,exercise_id,set_index,weight,reps,duration_sec,done_at,target_reps) values($1,$2,$3,$4,$5,$6,$7,$8)',
          [sid, String(s.exercise_id), +s.set_index || 0, s.weight == null || s.weight === '' ? null : +s.weight, s.reps == null ? null : Math.round(+s.reps), s.duration_sec ? +s.duration_sec : null, s.done_at ? new Date(s.done_at) : null, s.target_reps ? +s.target_reps : null])
      if (b.pain && RESTR.concat('general').includes(b.pain.code)) {
        await q(`insert into session_pain_reports(session_id,restriction_code,intensity,notes) values($1,$2,$3,$4)
          on conflict (session_id,restriction_code) do update set intensity=excluded.intensity, notes=excluded.notes`,
          [sid, b.pain.code, Math.max(0, Math.min(10, +b.pain.intensity || 0)), b.pain.notes ? String(b.pain.notes).slice(0, 500) : null])
      }
      json(res, 200, { id: sid, volume })
    },
    'GET /api/guided/progress': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const weeks = (await q(`select date_trunc('week', started_at at time zone 'America/Sao_Paulo')::date wk, count(*)::int n, coalesce(sum(volume_kg),0)::float vol
        from sessions where user_id=$1 and tenant_id=$2 and status='done' and started_at > now() - interval '8 weeks' group by 1 order by 1`, [u.id, u.tenant_id])).rows
      const history = (await q(`select s.id,s.workout_name,s.started_at,s.duration_sec,s.volume_kg::float volume,s.sets_count,s.exercises_count,s.feeling,
          exists(select 1 from session_pain_reports pr where pr.session_id=s.id) pain
        from sessions s where s.user_id=$1 and s.tenant_id=$2 and s.status='done' order by s.started_at desc limit 30`, [u.id, u.tenant_id])).rows
      const records = (await q(`select distinct on (ss.exercise_id) ss.exercise_id, e.name_pt name, e.media_url media, ss.weight::float weight, ss.reps, s.started_at
        from session_sets ss join sessions s on s.id=ss.session_id join exercises e on e.id=ss.exercise_id
        where s.user_id=$1 and s.status='done' and ss.weight > 0 order by ss.exercise_id, ss.weight desc, ss.reps desc`, [u.id])).rows.sort((a, b) => b.weight - a.weight).slice(0, 12)
      const tot = (await q(`select count(*)::int n, coalesce(sum(duration_sec),0)::int secs, coalesce(sum(volume_kg),0)::float vol from sessions where user_id=$1 and status='done'`, [u.id])).rows[0]
      json(res, 200, { weeks, history, records, totals: tot })
    },
    // carga muscular dos treinos guiados: por dia × exercício × grupo (o app soma com o histórico antigo e filtra o período)
    'GET /api/guided/muscle-load': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const r = await q(`select (s.started_at at time zone 'America/Sao_Paulo')::date::text d, ss.exercise_id, e.name_pt name, eg.group_id, eg.role,
          count(*)::int sets, coalesce(sum(coalesce(ss.weight,0)*coalesce(ss.reps,0)),0)::float volume
        from session_sets ss join sessions s on s.id=ss.session_id join exercises e on e.id=ss.exercise_id
        join exercise_groups eg on eg.exercise_id=ss.exercise_id
        where s.user_id=$1 and s.tenant_id=$2 and s.status='done'
        group by 1,2,3,4,5 order by 1`, [u.id, u.tenant_id])
      json(res, 200, { rows: r.rows })
    },
    // ---------- admin: lista simples + mudança de status ----------
    'GET /api/guided/admin/programs': async (req, res) => {
      const u = await requireRole('admin', 'profissional')(req, res, json); if (!u) return
      const r = await q(LIST_SQL + ' order by p.status, p.title', [u.tenant_id])
      const users = (await q(`select program_id, count(*)::int n from user_programs where status='active' group by program_id`)).rows
      const by = Object.fromEntries(users.map(x => [x.program_id, x.n]))
      json(res, 200, { programs: r.rows.map(p => ({ ...p, active_users: by[p.id] || 0 })) })
    },
    'POST /api/guided/admin/program-status': async (req, res) => {
      const u = await requireRole('admin')(req, res, json); if (!u) return
      const b = await readBody(req)
      if (!isUuid(b.id) || !STATUS.includes(b.status)) return json(res, 400, { error: 'Dados inválidos' })
      const r = await q(`update programs p set status=$2, version = version + case when $2='publicado' and status<>'publicado' then 1 else 0 end, updated_at=now()
        where p.id=$1 and ${tenantScope('p', 3)} returning id,status,version`, [b.id, b.status, u.tenant_id])
      if (!r.rowCount) return json(res, 404, { error: 'Programa não encontrado' })
      json(res, 200, r.rows[0])
    }
  }
}
