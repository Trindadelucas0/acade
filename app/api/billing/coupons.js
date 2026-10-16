// AVAGYM V5 - cupons e campanhas (PRD sec. 5 e 6, RN-CP-001..020).
// Cupom de teste concede direito temporario (entitlement_grants catalogo_completo) com prazo contado no SERVIDOR,
// um por conta para sempre, sem acumular, sem cobranca automatica e sem criar vinculo com o parceiro.
import { q, pool } from '../db/pool.js'
import { audit } from '../auth.js'
import { notifyBilling, policy } from './core.js'
import { refreshUsage } from '../entitlements.js'

export const MSG = {
  invalido: 'Este cupom não é válido. Confira o código e tente novamente.',
  terminou: 'A campanha deste cupom terminou.',
  ja_usou: 'Você já utilizou seu período gratuito de experimentação.'
}
export const normCode = s => String(s ?? '').trim().toUpperCase().replace(/\s+/g, '')
export const validFormat = s => /^[A-Z0-9_-]{3,32}$/.test(s)
const invalid = { error: MSG.invalido, code: 'COUPON_INVALID' }, ended = { error: MSG.terminou, code: 'COUPON_ENDED' }

// RN-CP-009: existe, campanha ativa, janela, limite, elegibilidade e historico
export async function validateCode(user, raw, c) {
  c = c || { query: q }
  const code = normCode(raw)
  if (!validFormat(code)) return invalid
  const row = (await c.query(`select pc.*, row_to_json(cp) campaign, pu.name partner_name from promotion_codes pc join campaigns cp on cp.id=pc.campaign_id
      left join users pu on pu.id=cp.partner_user_id where pc.tenant_id=$1 and pc.code_norm=$2 ${c.forUpdate ? 'for update of pc' : ''}`, [user.tenant_id, code])).rows[0]
  if (!row) return invalid
  const cp = row.campaign, now = Date.now(), t = d => d ? new Date(d).getTime() : null
  if (['revogado', 'pausado'].includes(row.status) || ['revogada', 'pausada', 'rascunho'].includes(cp.status)) return invalid
  if (cp.status === 'encerrada' || (t(row.ends_at) && t(row.ends_at) < now) || (t(cp.ends_at) && t(cp.ends_at) < now)) return ended
  if ((t(row.starts_at) && t(row.starts_at) > now) || (t(cp.starts_at) && t(cp.starts_at) > now)) return invalid
  if (row.max_redemptions && row.redemptions_count >= row.max_redemptions) return ended
  if (cp.max_redemptions) {
    const n = (await c.query('select count(*)::int n from promotion_redemptions where campaign_id=$1', [cp.id])).rows[0].n
    if (n >= cp.max_redemptions) return ended
  }
  if (cp.kind === 'parceiro') {   // parceiro precisa estar ativo no programa
    const p = (await c.query(`select status from partners where user_id=$1`, [cp.partner_user_id])).rows[0]
    if (!p || p.status !== 'ativo') return invalid
  }
  if (cp.benefit === 'trial') {
    if ((await c.query(`select 1 from promotion_redemptions where user_id=$1 and benefit='trial'`, [user.id])).rowCount) return { error: MSG.ja_usou, code: 'TRIAL_ALREADY_USED' }
    const sub = (await c.query(`select p.is_free from subscriptions s join plans p on p.id=s.plan_id where s.user_id=$1 and s.audience='aluno' and s.status in ('ativa','trial','inadimplente','carencia') limit 1`, [user.id])).rows[0]
    if (sub && !sub.is_free) return { error: 'Você já tem o AVAGYM Individual ativo. O período experimental é para quem ainda não assina.', code: 'ALREADY_SUBSCRIBED' }
  } else if ((await c.query(`select 1 from promotion_redemptions where user_id=$1 and code_id=$2`, [user.id, row.id])).rowCount) return { error: 'Você já usou este cupom.', code: 'COUPON_ALREADY_USED' }
  return { ok: true, code: row, campaign: cp, partner_name: cp.kind === 'parceiro' ? row.partner_name : null }
}
const days = async (cp, tid) => cp.trial_days || (await policy(tid)).experimental_dias || 7

// RN-CP-010: resgate atomico (trava a linha do codigo; indice unico garante 1 teste por conta)
export async function redeemTrial(user, raw) {
  const code = normCode(raw)
  const c = await pool.connect()
  try {
    await c.query('begin')
    // idempotencia: o mesmo usuario reenviando o mesmo codigo recebe o resgate ja feito
    const prev = (await c.query(`select r.*, cp.partner_user_id, cp.kind from promotion_redemptions r join promotion_codes pc on pc.id=r.code_id join campaigns cp on cp.id=r.campaign_id
        where r.user_id=$1 and pc.tenant_id=$2 and pc.code_norm=$3 and r.benefit='trial'`, [user.id, user.tenant_id, code])).rows[0]
    if (prev) { await c.query('rollback'); return { status: 200, already: true, ends_at: prev.ends_at, partner: prev.kind === 'parceiro' } }
    c.forUpdate = true
    const v = await validateCode(user, code, c)
    if (v.error) { await c.query('rollback'); return { status: v.code === 'COUPON_INVALID' ? 404 : 409, ...v } }
    if (v.campaign.benefit !== 'trial') { await c.query('rollback'); return { status: 400, error: 'Este é um cupom de desconto: use-o ao contratar um plano.', code: 'COUPON_WRONG_KIND' } }
    const d = await days(v.campaign, user.tenant_id)
    const g = (await c.query(`insert into entitlement_grants(tenant_id,user_id,audience,kind,key,value,reason,starts_at,expires_at)
        values($1,$2,'aluno','feature','catalogo_completo','true',$3,now(),now()+($4||' days')::interval) returning id, starts_at, expires_at`, [user.tenant_id, user.id, 'cupom:' + v.code.code_norm, String(d)])).rows[0]
    const r = await c.query(`insert into promotion_redemptions(tenant_id,code_id,campaign_id,user_id,benefit,grant_id,starts_at,ends_at) values($1,$2,$3,$4,'trial',$5,$6,$7) returning id`,
      [user.tenant_id, v.code.id, v.campaign.id, user.id, g.id, g.starts_at, g.expires_at])
    await c.query('update promotion_codes set redemptions_count=redemptions_count+1 where id=$1', [v.code.id])
    await c.query(`insert into attribution_events(tenant_id,campaign_id,code_id,partner_user_id,user_id,event,data) values($1,$2,$3,$4,$5,'resgate',$6)`,
      [user.tenant_id, v.campaign.id, v.code.id, v.campaign.partner_user_id || null, user.id, JSON.stringify({ benefit: 'trial', days: d, ends_at: g.expires_at })])
    await c.query('commit')
    await audit(user.tenant_id, user.id, 'cupom.resgate', 'promotion_redemption', r.rows[0].id, { campaign: v.campaign.id, days: d })
    await refreshUsage(user.id, 'aluno').catch(() => {})
    await notifyBilling(user.id, 'teste_cupom_ativo', { until: new Date(g.expires_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) }, 'grant' + g.id + ':inicio')
    return { status: 201, ends_at: g.expires_at, starts_at: g.starts_at, days: d, partner: v.campaign.kind === 'parceiro' ? { id: v.campaign.partner_user_id, name: v.partner_name } : null }
  } catch (e) {
    await c.query('rollback').catch(() => {})
    if (e.code === '23505') return { status: 409, error: MSG.ja_usou, code: 'TRIAL_ALREADY_USED' }   // clique duplo / corrida
    throw e
  } finally { c.release() }
}

// ---------- administracao ----------
const txt = (s, n = 200) => String(s ?? '').trim().slice(0, n)
const dt = s => { if (!s) return null; const d = new Date(s); return isNaN(d) ? undefined : d }
export async function saveCampaign(admin, b) {
  const kind = b.kind === 'parceiro' ? 'parceiro' : 'oficial', benefit = b.benefit === 'desconto' ? 'desconto' : 'trial'
  const name = txt(b.name, 120); if (name.length < 3) return { status: 400, error: 'Dê um nome à campanha.' }
  const starts = dt(b.starts_at), ends = dt(b.ends_at)
  if (starts === undefined || ends === undefined) return { status: 400, error: 'Datas inválidas.' }
  if (starts && ends && ends <= starts) return { status: 400, error: 'O fim dos resgates precisa ser depois do início.' }
  const trial = benefit === 'trial' ? (b.trial_days == null || b.trial_days === '' ? null : Math.round(+b.trial_days)) : null
  if (trial != null && !(trial >= 1 && trial <= 90)) return { status: 400, error: 'Duração do teste entre 1 e 90 dias.' }
  const pct = benefit === 'desconto' ? +b.discount_pct : null
  if (benefit === 'desconto' && !(pct > 0 && pct <= 100)) return { status: 400, error: 'Desconto entre 1% e 100%.' }
  const cycles = benefit === 'desconto' ? Math.max(1, Math.min(24, Math.round(+b.discount_cycles || 1))) : null
  const max = b.max_redemptions ? Math.round(+b.max_redemptions) : null; if (max != null && !(max > 0)) return { status: 400, error: 'Limite de resgates inválido.' }
  let partner = null
  if (kind === 'parceiro') {
    partner = (await q(`select p.user_id from partners p join users u on u.id=p.user_id where p.user_id=$1 and u.tenant_id=$2`, [b.partner_user_id, admin.tenant_id])).rows[0]?.user_id
    if (!partner) return { status: 400, error: 'Escolha um profissional aprovado no programa de parceiros.' }
  }
  const status = ['rascunho', 'ativa', 'pausada', 'encerrada', 'revogada'].includes(b.status) ? b.status : 'ativa'
  const applies = Array.isArray(b.applies_to) ? b.applies_to.map(x => txt(x, 60)).filter(Boolean).slice(0, 10) : []
  const vals = [name, kind, partner, benefit, trial, pct, cycles, applies, status, starts, ends, max, txt(b.notes, 500) || null]
  let r
  if (b.id) r = await q(`update campaigns set name=$2, kind=$3, partner_user_id=$4, benefit=$5, trial_days=$6, discount_pct=$7, discount_cycles=$8, applies_to=$9, status=$10, starts_at=$11, ends_at=$12,
      max_redemptions=$13, notes=$14, updated_at=now() where id=$1 and tenant_id=$15 returning *`, [b.id, ...vals, admin.tenant_id])
  else r = await q(`insert into campaigns(name,kind,partner_user_id,benefit,trial_days,discount_pct,discount_cycles,applies_to,status,starts_at,ends_at,max_redemptions,notes,tenant_id,created_by)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) returning *`, [...vals, admin.tenant_id, admin.id])
  if (!r.rowCount) return { status: 404, error: 'Campanha não encontrada.' }
  await audit(admin.tenant_id, admin.id, b.id ? 'campanha.editada' : 'campanha.criada', 'campaign', r.rows[0].id, { status, kind, benefit })
  return { status: b.id ? 200 : 201, campaign: r.rows[0] }
}
export async function createCode(admin, b) {
  const code = normCode(b.code)
  if (!validFormat(code)) return { status: 400, error: 'Código com 3 a 32 letras, números, hífen ou sublinhado.' }
  const cp = (await q('select id, status from campaigns where id=$1 and tenant_id=$2', [b.campaign_id, admin.tenant_id])).rows[0]
  if (!cp) return { status: 400, error: 'Escolha a campanha.' }
  const starts = dt(b.starts_at), ends = dt(b.ends_at), max = b.max_redemptions ? Math.round(+b.max_redemptions) : null
  if (starts === undefined || ends === undefined || (max != null && !(max > 0))) return { status: 400, error: 'Datas ou limite inválidos.' }
  try {
    const r = await q(`insert into promotion_codes(tenant_id,campaign_id,code,code_norm,max_redemptions,starts_at,ends_at) values($1,$2,$3,$4,$5,$6,$7) returning *`,
      [admin.tenant_id, cp.id, code, code, max, starts, ends])
    await audit(admin.tenant_id, admin.id, 'cupom.criado', 'promotion_code', r.rows[0].id, { campaign: cp.id })
    return { status: 201, code: r.rows[0] }
  } catch (e) { if (e.code === '23505') return { status: 409, error: 'Já existe um cupom com este código (maiúsculas e minúsculas são iguais).', code: 'COUPON_DUPLICATE' }; throw e }
}
// RN-CP-016: suspender/revogar impede novos resgates; beneficios ja concedidos continuam
export async function setCodeStatus(admin, b) {
  if (!['ativo', 'pausado', 'revogado'].includes(b.status)) return { status: 400, error: 'Status inválido.' }
  const r = await q(`update promotion_codes set status=$2, revoked_at=case when $2='revogado' then now() else null end where id=$1 and tenant_id=$3 returning id, code, status`, [b.id, b.status, admin.tenant_id])
  if (!r.rowCount) return { status: 404, error: 'Cupom não encontrado.' }
  await audit(admin.tenant_id, admin.id, 'cupom.status', 'promotion_code', b.id, { status: b.status, reason: txt(b.reason, 300) || null })
  return { status: 200, code: r.rows[0] }
}
// resultados agregados (sem dados pessoais) - usados pelo admin e pelo parceiro
export const STATS_SQL = `select pc.id, pc.code, pc.status, pc.max_redemptions, pc.redemptions_count, pc.starts_at, pc.ends_at,
    cp.id campaign_id, cp.name campaign_name, cp.kind, cp.benefit, cp.trial_days, cp.discount_pct, cp.discount_cycles, cp.status campaign_status, cp.ends_at campaign_ends_at,
    cp.partner_user_id, pu.name partner_name,
    (select count(*)::int from promotion_redemptions r where r.code_id=pc.id) resgates,
    (select count(distinct r.user_id)::int from promotion_redemptions r join sessions s on s.user_id=r.user_id and s.started_at >= r.created_at where r.code_id=pc.id) treinaram,
    (select count(distinct r.user_id)::int from promotion_redemptions r join coach_students cs on cs.student_id=r.user_id and cs.coach_id=cp.partner_user_id and cs.since >= r.created_at where r.code_id=pc.id) vinculos,
    (select count(distinct r.user_id)::int from promotion_redemptions r join subscriptions s on s.user_id=r.user_id join plans p on p.id=s.plan_id and not p.is_free
       where r.code_id=pc.id and s.started_at >= r.created_at) conversoes
  from promotion_codes pc join campaigns cp on cp.id=pc.campaign_id left join users pu on pu.id=cp.partner_user_id`
