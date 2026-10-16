// AVAGYM - Monetizacao F3: motor central de acesso (decisoes do Lucas D1-D9, 16/10/2026).
// Origens de acesso (podem coexistir): propria (assinatura paga), teste (trial_grants, 168h), concessao (entitlement_grants
// key='acesso', ex.: transicao D1 ou cortesia do admin) e personal (aluno vinculado a um personal com acesso - D4).
// Com 'monetizacao_ativa' DESLIGADA nada e bloqueado (comportamento atual). Ligada: tudo que nao esta na lista
// ALWAYS_ALLOWED exige acesso (negar por padrao: rota nova nasce protegida). Regras SO no backend.
import { q } from './db/pool.js'

export const PAID_STATUSES = ['ativa', 'trial', 'inadimplente', 'carencia']
const db = c => c || { query: (t, p) => q(t, p) }

// D3: sem acesso ficam so login, assinatura/pagamento, perfil, configuracoes, LGPD e gestao da conta
// (+ aceitar convite de personal, que devolve o acesso pelo plano dele - D4). Os dados nunca sao apagados.
export const ALWAYS_ALLOWED = [
  /^[A-Z]+ \/api\/auth\//, /^POST \/api\/logout(\/all)?$/, /^[A-Z]+ \/api\/me$/,
  /^[A-Z]+ \/api\/me\/(avatar|contact|context|delete-request|delete-request\/cancel|export-request|theme|tours|tours\/reset|subscriptions|capacities|social|onboarding\/skip|invites|coaches|unlock-request|requests)$/,
  /^[A-Z]+ \/api\/billing\//, /^GET \/api\/plans?$/, /^GET \/api\/public\//, /^[A-Z]+ \/api\/terms(\/accept)?$/, /^[A-Z]+ \/api\/legal\//,
  /^[A-Z]+ \/api\/(config|health|cep|activity)$/, /^GET \/api\/media(\/pub|\/private)?$/, /^[A-Z]+ \/api\/notification-prefs$/, /^[A-Z]+ \/api\/notifications(\/read)?$/,
  /^[A-Z]+ \/api\/push\/(public-key|subscribe|unsubscribe)$/, /^[A-Z]+ \/api\/social\/(profile|handle-check)$/, /^[A-Z]+ \/api\/data$/,
  /^[A-Z]+ \/api\/access\//, /^[A-Z]+ \/api\/invites\/(view|accept|decline)$/, /^POST \/api\/guided\/onboarding$/,
  /^[A-Z]+ \/api\/pro\/(verification|verification\/document|profile|partner)$/, /^[A-Z]+ \/api\/verification\/document$/, /^GET \/api\/convite$/
]
export const isAlwaysAllowed = key => ALWAYS_ALLOWED.some(r => r.test(key))

let flagCache = new Map()
export async function monetizationOn(tenantId) {
  const hit = flagCache.get(tenantId)
  if (hit && hit.at > Date.now() - 5000) return hit.on
  const on = (await q(`select value from app_settings where tenant_id=$1 and key='monetizacao_ativa'`, [tenantId])).rows[0]?.value === true
  flagCache.set(tenantId, { on, at: Date.now() })
  return on
}
export const clearMonetizationCache = () => { flagCache = new Map() }

// origens proprias de um publico (sem a origem "personal", para nao recursar)
async function ownSources(c, userId, audience) {
  const out = []
  const sub = (await c.query(`select s.id, s.plan_id, s.status, s.current_period_end, p.name plan_name from subscriptions s join plans p on p.id=s.plan_id
      where s.user_id=$1 and s.audience=$2 and s.status = any($3) and not p.is_free order by s.started_at desc limit 1`, [userId, audience, PAID_STATUSES])).rows[0]
  if (sub) out.push({ kind: 'propria', plan_id: sub.plan_id, plan_name: sub.plan_name, status: sub.status, until: sub.current_period_end })
  const t = (await c.query(`select t.id, t.plan_id, t.starts_at, t.ends_at, t.source, p.name plan_name from trial_grants t join plans p on p.id=t.plan_id
      where t.user_id=$1 and t.audience=$2 and t.revoked_at is null and t.starts_at<=now() and t.ends_at>now() limit 1`, [userId, audience])).rows[0]
  if (t) out.push({ kind: 'teste', plan_id: t.plan_id, plan_name: t.plan_name, starts_at: t.starts_at, until: t.ends_at, source: t.source })
  const g = (await c.query(`select id, reason, expires_at from entitlement_grants where user_id=$1 and audience=$2 and kind='feature' and key='acesso' and revoked_at is null
      and starts_at<=now() and (expires_at is null or expires_at>now()) order by expires_at desc nulls first limit 1`, [userId, audience])).rows[0]
  if (g) out.push({ kind: 'concessao', reason: g.reason, until: g.expires_at })
  return out
}

// resumo de acesso por publico. has=true se existe ao menos uma origem vigente.
export async function accessOf(user, c) {
  c = db(c)
  const roles = user.roles || []
  const out = { monetized: await monetizationOn(user.tenant_id), audiences: {} }
  for (const a of ['aluno', 'profissional']) {
    if (!roles.includes(a)) continue
    const sources = await ownSources(c, user.id, a)
    if (a === 'aluno') {   // D4: aluno vinculado usa o plano do personal (vaga ja contada no aceite)
      const coaches = (await c.query(`select cs.coach_id, u.name from coach_students cs join users u on u.id=cs.coach_id where cs.student_id=$1 and cs.status='ativo'`, [user.id])).rows
      for (const k of coaches) {
        const cs = await ownSources(c, k.coach_id, 'profissional')
        if (cs.length) { sources.push({ kind: 'personal', coach_id: k.coach_id, coach_name: k.name }); break }
      }
    }
    out.audiences[a] = { has: sources.length > 0, sources }
  }
  out.has_any = Object.values(out.audiences).some(x => x.has)
  return out
}

const NO_ACCESS_MSG = 'Seu acesso aos recursos do AVAGYM terminou. Seus dados continuam salvos e voltam assim que você assinar. Você ainda pode acessar sua conta, perfil, configurações, privacidade e a tela de assinatura.'

// middleware global (server.js), depois da autenticacao. Admin nunca e cobrado.
export async function monetizationGate(key, user, res, json) {
  if (!user || (user.roles || []).includes('admin')) return true
  const roles = user.roles || []
  if (!roles.includes('aluno') && !roles.includes('profissional')) return true
  if (isAlwaysAllowed(key)) return true
  if (!(await monetizationOn(user.tenant_id))) return true
  const acc = await accessOf(user)
  const path = key.split(' ')[1] || ''
  const ok = path.startsWith('/api/pro/') ? !!acc.audiences.profissional?.has : acc.has_any
  if (ok) return true
  json(res, 402, { error: NO_ACCESS_MSG, code: 'ACCESS_REQUIRED', audience: path.startsWith('/api/pro/') ? 'profissional' : null })
  return false
}

// GET /api/access/me: o que a tela de assinatura/teste mostra (origens, fim do teste, elegibilidade ao teste)
export function accessRoutes({ json, requireAuth }) {
  return {
    'GET /api/access/me': async (req, res) => {
      const u = await requireAuth(req, res, json, { allowPending: true }); if (!u) return
      const acc = await accessOf(u)
      const t = (await q(`select audience, plan_id, starts_at, ends_at, revoked_at, source from trial_grants where user_id=$1`, [u.id])).rows[0] || null
      const used = !!t || (await q(`select 1 from promotion_redemptions where user_id=$1 and benefit='trial'`, [u.id])).rowCount > 0
      const now = Date.now()
      json(res, 200, { ...acc, trial: t ? { ...t, active: !t.revoked_at && new Date(t.ends_at).getTime() > now, remaining_ms: Math.max(0, new Date(t.ends_at).getTime() - now) } : null, trial_eligible: !used })
    }
  }
}
