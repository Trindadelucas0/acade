// AVAGYM V4.1 — um treino ativo por aluno (programa do sistema OU ficha do profissional) + tema salvo no perfil.
// Ativar um deixa o outro inativo: user_programs vira 'switched' (pausado) e a ficha volta a valer só se o aluno escolher. Nada é apagado.
import { q } from './db/pool.js'
import { requireAuth } from './auth.js'
import { requireTrainee } from './guided.js'
const isUuid = s => /^[0-9a-f-]{36}$/i.test(String(s || ''))
const THEMES = ['system', 'dark', 'light']

async function proPlans(uid) {
  return (await q(`select p.id, p.title, p.updated_at, coalesce(pp.display_name,o.name) owner_name from pro_plans p join users o on o.id=p.owner_id
    left join professional_profiles pp on pp.user_id=o.id
    where p.student_id=$1 and p.status='ativo' and exists (select 1 from coach_students cs where cs.coach_id=p.owner_id and cs.student_id=$1 and cs.status='ativo')
    order by p.updated_at desc`, [uid])).rows
}
async function sysActive(uid) {
  return (await q(`select up.id, up.program_id, p.title from user_programs up join programs p on p.id=up.program_id where up.user_id=$1 and up.status='active' order by up.started_at desc limit 1`, [uid])).rows[0] || null
}
// V4.1 — regras de vínculo (Lucas): UMA ficha por vez. Programa do sistema ativo → é o treino; ficha do profissional
// que chega fica "aguardando" até o aluno desvincular o programa. Sem programa do sistema, a ficha do profissional é o treino
// e o aluno fica TRAVADO no profissional (catálogo do sistema bloqueado).
// Decisão do Lucas (V4.1): aluno de professor NÃO desvincula a ficha do personal — só o personal arquiva.
export const STUDENT_CAN_DETACH_PRO = false
export async function activeTrainingOf(uid) {
  const [choice, sys, plans] = await Promise.all([q('select * from student_active_training where user_id=$1', [uid]).then(r => r.rows[0] || null), sysActive(uid), proPlans(uid)])
  let kind = null, plan = null
  if (sys) kind = 'sistema'
  else if (plans.length) { kind = 'profissional'; plan = plans.find(p => p.id === choice?.pro_plan_id) || plans[0] }
  return { kind, program: sys, pro_plan: plan, locked_to_pro: kind === 'profissional', can_detach: kind === 'sistema' || (kind === 'profissional' && STUDENT_CAN_DETACH_PRO),
    pending_pro_plans: kind === 'sistema' ? plans : [], other_pro_plans: kind === 'profissional' ? plans.filter(p => p.id !== plan.id) : [],
    available: { program: sys, pro_plans: plans } }
}
export async function setActiveSystem(u, userProgramId, reason = 'ativou programa do sistema') {
  await q(`insert into student_active_training(user_id,tenant_id,kind,user_program_id,pro_plan_id,updated_at) values($1,$2,'sistema',$3,null,now())
    on conflict (user_id) do update set kind='sistema', user_program_id=excluded.user_program_id, pro_plan_id=null, updated_at=now()`, [u.id, u.tenant_id, userProgramId])
  await q(`insert into student_active_training_history(user_id,kind,user_program_id,reason) values($1,'sistema',$2,$3)`, [u.id, userProgramId, reason])
}
export function activeTrainingRoutes({ json, readBody }) {
  return {
    'GET /api/active-training': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      json(res, 200, await activeTrainingOf(u.id))
    },
    // { kind:'profissional', pro_plan_id } — pausa o programa do sistema (status 'switched', sem apagar)
    'POST /api/active-training': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const b = await readBody(req)
      if (b.kind !== 'profissional' || !isUuid(b.pro_plan_id)) return json(res, 400, { error: 'Para usar o programa do sistema, escolha-o em Programas.' })
      const plans = await proPlans(u.id)
      if (!plans.some(p => p.id === b.pro_plan_id)) return json(res, 404, { error: 'Ficha não encontrada ou vínculo inativo.' })
      const cur = await activeTrainingOf(u.id)
      if (cur.kind === 'sistema') return json(res, 409, { error: 'Você já tem um programa do sistema. Desvincule-o primeiro para aceitar a ficha do profissional.', code: 'MUST_DETACH' })
      if (cur.kind === 'profissional' && cur.pro_plan?.id !== b.pro_plan_id && !STUDENT_CAN_DETACH_PRO) return json(res, 409, { error: 'Você já tem uma ficha ativa. Só o seu profissional pode trocá-la.', code: 'ONE_PLAN' })
      await q(`insert into student_active_training(user_id,tenant_id,kind,pro_plan_id,user_program_id,updated_at) values($1,$2,'profissional',$3,null,now())
        on conflict (user_id) do update set kind='profissional', pro_plan_id=excluded.pro_plan_id, user_program_id=null, updated_at=now()`, [u.id, u.tenant_id, b.pro_plan_id])
      await q(`insert into student_active_training_history(user_id,kind,pro_plan_id,reason) values($1,'profissional',$2,'ativou ficha do profissional')`, [u.id, b.pro_plan_id])
      json(res, 200, await activeTrainingOf(u.id))
    },
    // desvincular (arquivar, nunca apagar): programa do sistema sempre; ficha do profissional nunca pelo aluno (decisão do Lucas)
    'POST /api/active-training/detach': async (req, res) => {
      const u = await requireTrainee(req, res, json); if (!u) return
      const cur = await activeTrainingOf(u.id)
      if (cur.kind === 'sistema') {
        await q(`update user_programs set status='abandoned', ended_at=now(), end_reason='desvinculado pelo aluno' where user_id=$1 and status='active'`, [u.id])
        await q(`insert into student_active_training_history(user_id,kind,user_program_id,reason) values($1,'sistema',$2,'desvinculou programa do sistema')`, [u.id, cur.program.id])
        return json(res, 200, await activeTrainingOf(u.id))
      }
      if (cur.kind === 'profissional') return json(res, 403, { error: 'A ficha do profissional só pode ser retirada pelo seu profissional.', code: 'PRO_DETACH_ONLY' })
      json(res, 409, { error: 'Você não tem treino ativo.' })
    },
    'GET /api/me/theme': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      json(res, 200, { theme: (await q('select theme_pref from users where id=$1', [u.id])).rows[0]?.theme_pref || 'system' })
    },
    'POST /api/me/theme': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      const b = await readBody(req); if (!THEMES.includes(b.theme)) return json(res, 400, { error: 'tema inválido' })
      await q('update users set theme_pref=$2 where id=$1', [u.id, b.theme]); json(res, 200, { theme: b.theme })
    }
  }
}
