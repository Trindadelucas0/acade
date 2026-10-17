// AVAGYM lote 7 (16/10/2026): Progresso e estatisticas + widgets do Inicio. Tudo vem do PostgreSQL e segue a regra
// unica de metricas (countsInMetrics: sessao concluida, nao anulada, sem tempo corrigido, fora do legado).
// Fuso: America/Sao_Paulo. 1RM estimado: Epley (carga x (1 + reps/30)), so para series de 1 a 12 repeticoes.
import { q } from './db/pool.js'
import { requireTrainee, activeOf, programFull, sessionsDoneIn, profileOf } from './guided.js'
import { activeTrainingOf } from './active-training.js'
import { countsInMetrics } from './metrics.js'

const TZ = `'America/Sao_Paulo'`
export const PERIODS = [7, 30, 90, 180, 365, 0]
export const e1rm = (w, r) => (w > 0 && r >= 1 && r <= 12) ? Math.round(w * (1 + r / 30) * 10) / 10 : null
const qs = req => new URL(req.url, 'http://x').searchParams

// meta semanal: dias do programa ativo > resposta do questionario > 3
async function weeklyTarget(u) {
  const a = await activeOf(u); if (a?.days_per_week) return a.days_per_week
  const p = await profileOf(u.id); return p?.dias || 3
}

export async function statsOf(u, dias) {
  const per = dias ? `and s.started_at >= now() - ($3::int * interval '1 day')` : `and $3::int >= 0`
  const P = [u.id, u.tenant_id, dias || 0]
  const base = `from sessions s where s.user_id=$1 and s.tenant_id=$2 and ${countsInMetrics('s')} ${per}`
  const [k, weeks, dow, days, groups, exs, firstAt, target] = await Promise.all([
    q(`select count(*)::int n, coalesce(sum(s.volume_kg),0)::float vol, coalesce(sum(s.duration_sec),0)::int secs, coalesce(avg(nullif(s.duration_sec,0)),0)::int avg_secs,
        count(distinct (s.started_at at time zone ${TZ})::date)::int active_days, coalesce(sum(s.sets_count),0)::int sets ${base}`, P),
    q(`select date_trunc('week', s.started_at at time zone ${TZ})::date::text wk, count(*)::int n, coalesce(sum(s.volume_kg),0)::float vol, coalesce(sum(s.duration_sec),0)::int secs ${base} group by 1 order by 1`, P),
    q(`select extract(isodow from s.started_at at time zone ${TZ})::int dow, count(*)::int n ${base} group by 1`, P),
    q(`select (s.started_at at time zone ${TZ})::date::text d, count(*)::int n, coalesce(sum(s.duration_sec),0)::int secs ${base} group by 1 order by 1`, P),
    q(`select eg.group_id, sum(case when eg.role='primary' then 1 else 0.4 end)::float sets, coalesce(sum(case when eg.role='primary' then coalesce(ss.weight,0)*coalesce(ss.reps,0) else 0 end),0)::float vol
        from session_sets ss join sessions s on s.id=ss.session_id join exercise_groups eg on eg.exercise_id=ss.exercise_id
        where s.user_id=$1 and s.tenant_id=$2 and ${countsInMetrics('s')} ${per} and ss.removed_at is null group by 1 order by 2 desc`, P),
    q(`select ss.exercise_id, e.name_pt name, (s.started_at at time zone ${TZ})::date::text d, max(ss.weight)::float w,
        max(case when ss.weight>0 and ss.reps between 1 and 12 then ss.weight*(1+ss.reps/30.0) end)::float e1rm, count(*)::int sets,
        coalesce(sum(coalesce(ss.weight,0)*coalesce(ss.reps,0)),0)::float vol
        from session_sets ss join sessions s on s.id=ss.session_id join exercises e on e.id=ss.exercise_id
        where s.user_id=$1 and s.tenant_id=$2 and ${countsInMetrics('s')} ${per} and ss.removed_at is null group by 1,2,3 order by 3`, P),
    q(`select min(s.started_at) at time zone ${TZ} first ${base}`, P),
    weeklyTarget(u)
  ])
  // carga por exercicio: os 8 com mais series no periodo, serie diaria de carga maxima e 1RM estimado
  const byEx = new Map()
  for (const r of exs.rows) { const x = byEx.get(r.exercise_id) || { exercise_id: r.exercise_id, name: r.name, sets: 0, vol: 0, points: [] }; x.sets += r.sets; x.vol += r.vol; x.points.push({ d: r.d, w: r.w, e1rm: r.e1rm && Math.round(r.e1rm * 10) / 10 }); byEx.set(r.exercise_id, x) }
  const exercises = [...byEx.values()].sort((a, b) => b.sets - a.sets).slice(0, 8)
  // recordes: melhor 1RM estimado de todos os tempos por exercicio; "novo" se foi batido dentro do periodo
  const recs = (await q(`with b as (select distinct on (ss.exercise_id) ss.exercise_id, e.name_pt name, ss.weight::float w, ss.reps, s.started_at,
        ss.weight*(1+ss.reps/30.0) e1rm from session_sets ss join sessions s on s.id=ss.session_id join exercises e on e.id=ss.exercise_id
        where s.user_id=$1 and s.tenant_id=$2 and ${countsInMetrics('s')} and ss.removed_at is null and ss.weight>0 and ss.reps between 1 and 12
        order by ss.exercise_id, ss.weight*(1+ss.reps/30.0) desc, s.started_at)
      select * from b order by e1rm desc limit 10`, [u.id, u.tenant_id])).rows
  const since = dias ? Date.now() - dias * 864e5 : 0
  const records = recs.map(r => ({ exercise_id: r.exercise_id, name: r.name, weight: r.w, reps: r.reps, e1rm: Math.round(r.e1rm * 10) / 10, at: r.started_at, new: dias ? +new Date(r.started_at) >= since : false }))
  // consistencia: semanas do periodo (desde a primeira sessao, se for mais recente) que bateram a meta
  const first = firstAt.rows[0]?.first ? new Date(firstAt.rows[0].first) : null
  const sinceFirst = first ? Math.max(7, (Date.now() - first) / 864e5) : 7
  const nWeeks = Math.max(1, Math.ceil((dias ? Math.min(dias, sinceFirst) : sinceFirst) / 7))
  const hit = weeks.rows.filter(w => w.n >= target).length
  const kk = k.rows[0]
  return {
    period_days: dias, target_per_week: target,
    kpis: { ...kk, per_week: Math.round(kk.n / nWeeks * 10) / 10, weeks: nWeeks, weeks_hit: hit, consistency_pct: Math.round(Math.min(1, hit / nWeeks) * 100), avg_volume: kk.n ? Math.round(kk.vol / kk.n) : 0 },
    weeks: weeks.rows, days: days.rows, weekdays: [1, 2, 3, 4, 5, 6, 7].map(d => ({ dow: d, n: dow.rows.find(x => x.dow === d)?.n || 0 })),
    groups: groups.rows.map(g => ({ group_id: g.group_id, sets: Math.round(g.sets * 10) / 10, vol: Math.round(g.vol) })),
    exercises, records
  }
}

// proxima sessao do treino ativo: ficha do personal (prioridade, regra R13) ou programa do sistema
export async function nextSessionOf(u) {
  const at = await activeTrainingOf(u.id)
  let name = null, source = null, items = []
  if (at.kind === 'profissional' && at.pro_plan) {
    const p = (await q('select id, title, exercises, days from pro_plans where id=$1', [at.pro_plan.id])).rows[0]
    if (p) {
      const days = (p.days || []).filter(d => d.exercises?.length)
      if (days.length) {
        const n = (await q(`select count(*)::int n from sessions s where s.user_id=$1 and s.pro_plan_id=$2 and s.status='done'`, [u.id, p.id])).rows[0].n
        const d = days[n % days.length]; name = `${p.title} · ${d.name || 'Dia ' + ((n % days.length) + 1)}`; items = d.exercises
      } else { name = p.title; items = p.exercises || [] }
      source = 'ficha'
    }
  } else {
    const a = await activeOf(u)
    if (a) {
      const p = await programFull(a.program_id, u.tenant_id, a.revision_id)
      if (p && p.status !== 'revogado' && p.workouts?.length) { const done = await sessionsDoneIn(a.id); const w = p.workouts[done % p.workouts.length]; name = w.name; items = w.exercises; source = 'programa' }
    }
  }
  if (!source) return null
  const ids = [...new Set(items.map(e => e.exercise_id).filter(Boolean))]
  const sets = Object.fromEntries(items.map(e => [e.exercise_id, +e.sets || 3]))
  const g = ids.length ? (await q('select exercise_id, group_id, role from exercise_groups where exercise_id = any($1)', [ids])).rows : []
  const load = {}
  for (const r of g) load[r.group_id] = Math.round(((load[r.group_id] || 0) + (r.role === 'primary' ? 1 : 0.4) * (sets[r.exercise_id] || 3)) * 10) / 10
  return { source, name, exercises: ids.length, groups: Object.entries(load).map(([group_id, sets]) => ({ group_id, sets })).sort((a, b) => b.sets - a.sets) }
}

// widgets do Inicio: semana atual x anterior, sequencia de dias, recordes recentes (14 dias) e proxima sessao
export async function homeOf(u) {
  const wk = `date_trunc('week', now() at time zone ${TZ})`
  const [cur, prev, days, next, recent] = await Promise.all([
    q(`select count(*)::int n, coalesce(sum(volume_kg),0)::float vol, coalesce(sum(duration_sec),0)::int secs from sessions s where user_id=$1 and ${countsInMetrics('s')} and (started_at at time zone ${TZ}) >= ${wk}`, [u.id]),
    q(`select count(*)::int n, coalesce(sum(volume_kg),0)::float vol, coalesce(sum(duration_sec),0)::int secs from sessions s where user_id=$1 and ${countsInMetrics('s')} and (started_at at time zone ${TZ}) >= ${wk} - interval '7 days' and (started_at at time zone ${TZ}) < ${wk}`, [u.id]),
    q(`select distinct (started_at at time zone ${TZ})::date::text d from sessions s where user_id=$1 and ${countsInMetrics('s')} order by 1 desc limit 400`, [u.id]),
    nextSessionOf(u),
    statsRecent(u)
  ])
  // sequencia de dias: dias seguidos com treino terminando hoje ou ontem (descanso de hoje nao quebra)
  const set = new Set(days.rows.map(r => r.d)), today = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const c = new Date(today); if (!set.has(iso(c))) c.setDate(c.getDate() - 1)
  let streak = 0; while (set.has(iso(c))) { streak++; c.setDate(c.getDate() - 1) }
  const best = (() => { const arr = [...set].sort(); let b = 0, r = 0, last = null; for (const d of arr) { const t = +new Date(d + 'T12:00:00'); r = last && t - last <= 864e5 + 36e5 ? r + 1 : 1; last = t; if (r > b) b = r } return b })()
  return { week: cur.rows[0], prev_week: prev.rows[0], streak_days: streak, best_streak_days: best, next, recent_records: recent }
}
async function statsRecent(u) {
  // recordes de 1RM estimado batidos nos ultimos 14 dias (superam todo o historico anterior)
  return (await q(`with x as (select ss.exercise_id, e.name_pt name, ss.weight::float w, ss.reps, s.started_at, ss.weight*(1+ss.reps/30.0) e1rm
      from session_sets ss join sessions s on s.id=ss.session_id join exercises e on e.id=ss.exercise_id
      where s.user_id=$1 and ${countsInMetrics('s')} and ss.removed_at is null and ss.weight>0 and ss.reps between 1 and 12),
    b as (select distinct on (exercise_id) * from x order by exercise_id, e1rm desc, started_at)
    select b.* from b where b.started_at >= now() - interval '14 days'
      and b.e1rm > (select max(e1rm) from x where x.exercise_id=b.exercise_id and x.started_at < b.started_at)   -- primeira vez no exercicio nao conta como recorde
    order by b.started_at desc limit 3`, [u.id])).rows.map(r => ({ exercise_id: r.exercise_id, name: r.name, weight: r.w, reps: r.reps, e1rm: Math.round(r.e1rm * 10) / 10, at: r.started_at }))
}

export function statsRoutes({ json }) {
  return {
    'GET /api/guided/stats': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const d = +(qs(req).get('dias') ?? 30)
      if (!PERIODS.includes(d)) return json(res, 400, { error: 'Período inválido. Use 7, 30, 90, 180, 365 ou 0 (tudo).', code: 'INVALID_INPUT' })
      json(res, 200, await statsOf(u, d))
    },
    'GET /api/guided/home': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      json(res, 200, await homeOf(u))
    }
  }
}
