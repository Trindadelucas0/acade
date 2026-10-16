// AVAGYM - Monetizacao F5: link de indicacao /convite/CODIGO, cliques, atribuicao no cadastro e painel do indicador.
// Regras (D2/D5): atribuicao ao PRIMEIRO indicador valido (referral_attributions.user_id unico, nunca sobrescrito;
// troca so pelo admin, auditada); janela de 30 dias entre o clique e o cadastro (o front guarda o codigo com a data);
// o indicador ve nome, @, data do cadastro e status (teste/assinante) dos indicados - nunca telefone ou e-mail.
import { clientIp } from './clientip.js'   // BUG-044
import crypto from 'node:crypto'
import { q } from './db/pool.js'
import { audit } from './auth.js'
import { normPhone, fraudSignal } from './billing/coupons.js'

export const REF_WINDOW_DAYS = 30
const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const randCode = () => Array.from(crypto.randomBytes(8), b => A[b % A.length]).join('')
const SALT = () => process.env.IDENTITY_SALT || process.env.JWT_SECRET || 'avagym-dev'
const hm = v => crypto.createHmac('sha256', SALT()).update(String(v)).digest('hex').slice(0, 40)
export const LINK_BASE = () => (process.env.PUBLIC_URL || process.env.ORIGIN || 'https://ornygym.avadesk.com.br').replace(/\/+$/, '')

export async function ensureReferralCode(user) {
  const cur = (await q('select code, status from referral_codes where user_id=$1', [user.id])).rows[0]
  if (cur) return cur
  for (let i = 0; i < 5; i++) {
    try { return (await q(`insert into referral_codes(user_id,tenant_id,code) values($1,$2,$3) returning code, status`, [user.id, user.tenant_id, randCode()])).rows[0] }
    catch (e) { if (e.code !== '23505') throw e; const again = (await q('select code, status from referral_codes where user_id=$1', [user.id])).rows[0]; if (again) return again }
  }
  throw new Error('nao foi possivel gerar o codigo de indicacao')
}

// Lucas (16/10, 20:38): indicacao SO por CODIGO de cupom (sem link). Cada usuario tem um cupom proprio kind='indicacao'
// (dono = ele) numa campanha de sistema "Indicacoes de usuarios" (beneficio: teste de 7 dias, D2). Quem recebe digita o
// codigo no cadastro (etapa 4) ou em Planos; o resgate concede o teste e registra o indicador (primeiro valido, nunca sobrescrito).
export const SYS_CAMPAIGN = 'Indicações de usuários'
async function systemCampaign(tenantId) {
  const cur = (await q(`select id from campaigns where tenant_id=$1 and name=$2 order by created_at limit 1`, [tenantId, SYS_CAMPAIGN])).rows[0]
  if (cur) return cur.id
  const r = await q(`insert into campaigns(name,kind,benefit,trial_days,status,notes,tenant_id) values($1,'oficial','trial',7,'ativa',$2,$3) returning id`,
    [SYS_CAMPAIGN, 'Campanha de sistema: cupons de indicação de cada usuário (criada automaticamente).', tenantId])
  await audit(tenantId, null, 'campanha.criada', 'campaign', r.rows[0].id, { sistema: true, name: SYS_CAMPAIGN })
  return r.rows[0].id
}
export async function ensureReferralCoupon(user) {
  const own = (await q(`select pc.code from promotion_codes pc where pc.owner_user_id=$1 and pc.kind='indicacao' and pc.status='ativo' order by pc.created_at limit 1`, [user.id])).rows[0]
  if (own) return own.code
  const camp = await systemCampaign(user.tenant_id)
  const base = (await ensureReferralCode(user)).code
  for (let i = 0; i < 6; i++) {
    const code = i === 0 ? base : randCode()
    try {
      const r = await q(`insert into promotion_codes(tenant_id,campaign_id,code,code_norm,kind,owner_user_id,channel,notes) values($1,$2,$3,$3,'indicacao',$4,'indicacao_usuario','cupom pessoal de indicação') returning id, code`, [user.tenant_id, camp, code, user.id])
      await q(`insert into coupon_changes(tenant_id,code_id,actor_id,action,after) values($1,$2,$3,'criado',$4)`, [user.tenant_id, r.rows[0].id, user.id, JSON.stringify({ code, kind: 'indicacao', automatico: true })])
      return r.rows[0].code
    } catch (e) { if (e.code !== '23505') throw e }
  }
  throw new Error('nao foi possivel gerar o cupom de indicacao')
}

// resolve /convite/CODIGO: convite do personal (pro_invites) ou indicacao (referral_codes). Resposta generica se nao existir.
export async function resolveInviteCode(raw, req, tenantSlug) {
  const code = String(raw || '').trim().toUpperCase()
  if (!/^[A-Z0-9_-]{4,32}$/.test(code)) return null
  const inv = (await q(`select status from pro_invites where upper(code)=$1`, [code])).rows[0]
  if (inv) return { type: 'convite_personal', status: inv.status }
  if (process.env.REFERRAL_LINKS !== 'on') return null   // Lucas 16/10: indicacao so por codigo; /convite fica so para convite de personal
  const r = (await q(`select rc.user_id, rc.tenant_id, u.name from referral_codes rc join users u on u.id=rc.user_id and u.status='ativo' and u.disabled_at is null
      where upper(rc.code)=$1 and rc.status='ativo'`, [code])).rows[0]
  if (!r) return null
  const ip = clientIp(req)
  const vid = String(req.headers['x-visitor-id'] || '').slice(0, 64)
  const visitor = hm('v:' + (vid || ip + '|' + (req.headers['user-agent'] || '')))
  await q(`insert into referral_clicks(tenant_id,referrer_user_id,visitor_hash,ip_hash,user_agent) values($1,$2,$3,$4,$5) on conflict do nothing`,
    [r.tenant_id, r.user_id, visitor, ip ? hm('ip:' + ip) : null, String(req.headers['user-agent'] || '').slice(0, 200)])
  // cupom de indicacao ativo do indicador (D2: o cupom concede o teste); o front preenche no cadastro
  const coupon = (await q(`select pc.code from promotion_codes pc join campaigns cp on cp.id=pc.campaign_id where pc.owner_user_id=$1 and pc.kind='indicacao'
      and pc.status='ativo' and cp.status='ativa' and (pc.ends_at is null or pc.ends_at>now()) and (cp.ends_at is null or cp.ends_at>now()) order by pc.created_at desc limit 1`, [r.user_id])).rows[0]
  return { type: 'indicacao', code, referrer: { first_name: String(r.name || '').split(/\s+/)[0] }, coupon: coupon?.code || null, window_days: REF_WINDOW_DAYS }
}

// atribuicao no cadastro pelo link (primeiro indicador; nunca sobrescreve). Autoindicacao por identidade = sem atribuicao + alerta.
export async function attributeSignup(userId, tenantId, raw) {
  const code = String(raw || '').trim().toUpperCase(); if (!code) return null
  const r = (await q(`select user_id from referral_codes where upper(code)=$1 and tenant_id=$2 and status='ativo'`, [code, tenantId])).rows[0]
  if (!r || r.user_id === userId) return null
  const ph = (await q(`select user_id, phone from user_contact where user_id = any($1)`, [[userId, r.user_id]])).rows
  const p1 = normPhone(ph.find(x => x.user_id === userId)?.phone), p2 = normPhone(ph.find(x => x.user_id === r.user_id)?.phone)
  if (p1 && p1 === p2) { await fraudSignal(tenantId, userId, 'autoindicacao_mesmo_telefone', 80, { referrer: r.user_id }); return null }
  const a = await q(`insert into referral_attributions(tenant_id,user_id,referrer_user_id,source) values($1,$2,$3,'link') on conflict (user_id) do nothing returning id`, [tenantId, userId, r.user_id])
  if (a.rowCount) await audit(tenantId, userId, 'indicacao.atribuida', 'referral_attribution', a.rows[0].id, { referrer: r.user_id, source: 'link' })
  return a.rows[0] || null
}

const STATUS_SQL = `case when exists (select 1 from subscriptions s join plans p on p.id=s.plan_id where s.user_id=u.id and not p.is_free and s.status in ('ativa','inadimplente','carencia')) then 'assinante'
  when exists (select 1 from trial_grants t where t.user_id=u.id and t.revoked_at is null and t.ends_at>now()) then 'teste'
  when exists (select 1 from trial_grants t where t.user_id=u.id) then 'teste_encerrado' else 'cadastrado' end`
export async function referralStats(userId) {
  const m = (await q(`select (select count(*)::int from referral_clicks where referrer_user_id=$1) cliques,
      (select count(*)::int from referral_attributions where referrer_user_id=$1) cadastros,
      (select count(*)::int from referral_attributions a where a.referrer_user_id=$1 and exists (select 1 from trial_grants t where t.user_id=a.user_id)) testes,
      (select count(*)::int from referral_attributions a where a.referrer_user_id=$1 and exists (select 1 from subscriptions s join plans p on p.id=s.plan_id where s.user_id=a.user_id and not p.is_free and s.status in ('ativa','inadimplente','carencia'))) assinantes`, [userId])).rows[0]
  // D5: nome, @, data do cadastro e status. Sem telefone/e-mail.
  const people = (await q(`select u.name, coalesce(sp.handle, (select h.handle from social_handles h where h.user_id=u.id limit 1)) handle, u.created_at cadastro, ${STATUS_SQL} status
      from referral_attributions a join users u on u.id=a.user_id left join social_profiles sp on sp.user_id=u.id where a.referrer_user_id=$1 order by a.attributed_at desc limit 200`, [userId])).rows
  return { ...m, pessoas: people }
}

export function referralRoutes({ json, requireAuth }) {
  return {
    'GET /api/convite': async (req, res) => {
      const code = new URL(req.url, 'http://x').searchParams.get('code')
      const r = await resolveInviteCode(code, req)
      if (!r) return json(res, 404, { error: 'Link inválido ou expirado.', code: 'INVITE_NOT_FOUND' })
      json(res, 200, r)
    },
    'GET /api/referral/me': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      const code = await ensureReferralCoupon(u)   // sem link (Lucas 16/10): so o codigo do cupom
      const { cliques, ...stats } = await referralStats(u.id)
      json(res, 200, { code, ...stats })
    }
  }
}
