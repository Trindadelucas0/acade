// AVAGYM - Monetizacao F7: Administracao > Monetizacao (painel e submenus). Somente admin (o despachante ja barra
// /api/adm/* para nao-admin; as rotas conferem de novo). Receita CONFIRMADA = cobrancas pagas fora do simulador;
// valores do simulador aparecem separados e rotulados. MRR e estimativa (nao e dinheiro recebido).
import { q } from './db/pool.js'
import { audit } from './auth.js'

const isUuid = s => /^[0-9a-f-]{36}$/i.test(String(s || ''))
const txt = (s, n = 300) => String(s ?? '').trim().slice(0, n)
function period(req) {
  const u = new URL(req.url, 'http://x').searchParams
  const d = s => { const x = s ? new Date(s) : null; return x && !isNaN(x) ? x : null }
  const to = d(u.get('to')) || new Date(), from = d(u.get('from')) || new Date(to.getTime() - 30 * 864e5)
  return { from, to, campaign: isUuid(u.get('campaign')) ? u.get('campaign') : null, plan: txt(u.get('plan'), 40) || null, channel: txt(u.get('channel'), 60) || null, status: txt(u.get('status'), 30) || null }
}

export async function overview(tid, p) {
  const one = async (sql, args = []) => (await q(sql, [tid, ...args])).rows[0]
  const subs = await one(`select count(*) filter (where s.status='ativa')::int ativas, count(*) filter (where s.status in ('inadimplente','carencia'))::int tolerancia,
      count(*) filter (where s.status='suspensa' and s.suspended_kind='financeiro')::int vencidas,
      coalesce(sum(coalesce(s.price_cents,p.price_cents)) filter (where s.status in ('ativa','inadimplente','carencia') and coalesce(s.provider,'') <> 'simulado'),0)::int mrr_estimado,
      coalesce(sum(coalesce(s.price_cents,p.price_cents)) filter (where s.status in ('ativa','inadimplente','carencia') and s.provider = 'simulado'),0)::int mrr_simulado
    from subscriptions s join plans p on p.id=s.plan_id and not p.is_free where s.tenant_id=$1 and ($2::text is null or s.plan_id=$2)`, [p.plan])
  const trials = await one(`select count(*) filter (where t.revoked_at is null and t.ends_at>now())::int em_teste,
      count(*) filter (where t.ends_at<=now() and t.created_at between $2 and $3)::int expirados_periodo,
      count(*) filter (where t.created_at between $2 and $3)::int iniciados_periodo,
      count(*) filter (where t.created_at between $2 and $3 and exists (select 1 from subscriptions s join plans pl on pl.id=s.plan_id where s.user_id=t.user_id and not pl.is_free and s.status in ('ativa','inadimplente','carencia')))::int convertidos_periodo
    from trial_grants t left join promotion_codes pc on pc.id=t.code_id where t.tenant_id=$1 and ($4::uuid is null or pc.campaign_id=$4) and ($5::text is null or pc.channel=$5)`, [p.from, p.to, p.campaign, p.channel])
  const rev = await one(`select coalesce(sum(amount_cents) filter (where provider<>'simulado'),0)::int receita_confirmada, coalesce(sum(amount_cents) filter (where provider='simulado'),0)::int receita_simulada,
      count(*) filter (where provider<>'simulado')::int pagamentos_reais from billing_charges where tenant_id=$1 and status='paga' and paid_at between $2 and $3`, [p.from, p.to])
  const canc = await one(`select count(*)::int n from subscription_events e join subscriptions s on s.id=e.subscription_id where s.tenant_id=$1 and e.action in ('cancelamento_agendado','cancelamento_usuario') and e.created_at between $2 and $3`, [p.from, p.to])
  const cup = await one(`select count(*) filter (where pc.status='ativo')::int ativos, (select count(*)::int from promotion_redemptions r where r.tenant_id=$1 and r.created_at between $2 and $3) resgates_periodo
    from promotion_codes pc where pc.tenant_id=$1`, [p.from, p.to])
  const fraude = await one(`select count(*)::int n from fraud_signals where tenant_id=$1 and status='aberto'`)
  const top = (await q(`select a.referrer_user_id id, u.name, count(*)::int cadastros,
      count(*) filter (where exists (select 1 from trial_grants t where t.user_id=a.user_id))::int testes,
      count(distinct rc.attribution_id) filter (where rc.kind='assinatura' and rc.live)::int pagas_reais,
      count(distinct rc.attribution_id) filter (where rc.kind='assinatura' and not rc.live)::int pagas_simuladas,
      coalesce(sum(rc.amount_cents) filter (where rc.kind='pagamento' and rc.live),0)::int - coalesce(sum(rc.amount_cents) filter (where rc.kind='reembolso' and rc.live),0)::int receita_liquida
    from referral_attributions a join users u on u.id=a.referrer_user_id left join referral_conversions rc on rc.attribution_id=a.id
    where a.tenant_id=$1 and a.attributed_at between $2 and $3 group by a.referrer_user_id, u.name order by cadastros desc limit 20`, [tid, p.from, p.to])).rows
    .map(r => ({ ...r, conversao_pct: r.cadastros ? Math.round(1000 * (r.pagas_reais + r.pagas_simuladas) / r.cadastros) / 10 : 0 }))
  return { periodo: { from: p.from, to: p.to }, assinaturas: subs, testes: { ...trials, conversao_pct: trials.iniciados_periodo ? Math.round(1000 * trials.convertidos_periodo / trials.iniciados_periodo) / 10 : 0 },
    receita: rev, cancelamentos_periodo: canc.n, cupons: cup, suspeitas_abertas: fraude.n, top_indicadores: top,
    avisos: ['MRR estimado não é dinheiro recebido.', 'Valores do simulador nunca entram na receita confirmada.'] }
}

export function monetizationAdminRoutes({ json, readBody, requireRole }) {
  const admin = requireRole('admin')
  return {
    'GET /api/adm/monetizacao/overview': async (req, res) => { const u = await admin(req, res, json); if (!u) return; json(res, 200, await overview(u.tenant_id, period(req))) },
    'GET /api/adm/monetizacao/testes': async (req, res) => {
      const u = await admin(req, res, json); if (!u) return
      const r = await q(`select t.id, t.user_id, us.name, us.email, t.audience, t.plan_id, t.source, pc.code, t.starts_at, t.ends_at, t.revoked_at, t.revoke_reason,
          case when t.revoked_at is not null then 'revogado' when t.ends_at>now() then 'ativo' else 'expirado' end status
        from trial_grants t join users us on us.id=t.user_id left join promotion_codes pc on pc.id=t.code_id where t.tenant_id=$1 order by t.created_at desc limit 300`, [u.tenant_id])
      json(res, 200, { testes: r.rows })
    },
    'POST /api/adm/monetizacao/testes/revogar': async (req, res) => {
      const u = await admin(req, res, json); if (!u) return
      const b = await readBody(req); if (txt(b.reason).length < 3) return json(res, 400, { error: 'Informe o motivo.' })
      const r = await q(`update trial_grants set revoked_at=now(), revoked_by=$3, revoke_reason=$4 where id=$1 and tenant_id=$2 and revoked_at is null returning user_id, starts_at`, [+b.id, u.tenant_id, u.id, txt(b.reason)])
      if (!r.rowCount) return json(res, 404, { error: 'Teste não encontrado ou já revogado.' })
      await q(`update entitlement_grants set revoked_at=now() where user_id=$1 and key='catalogo_completo' and reason like 'cupom:%' and revoked_at is null`, [r.rows[0].user_id])
      await audit(u.tenant_id, u.id, 'monetizacao.teste_revogado', 'trial_grant', String(b.id), { reason: txt(b.reason) })
      json(res, 200, { ok: true })
    },
    'GET /api/adm/monetizacao/cupons': async (req, res) => {
      const u = await admin(req, res, json); if (!u) return
      const r = await q(`select pc.id, pc.code, pc.kind, pc.status, pc.max_redemptions, pc.redemptions_count, pc.starts_at, pc.ends_at, pc.channel, pc.eligible_audience, pc.eligible_plans, pc.notes, pc.created_at,
          cp.name campaign, ow.name owner_name, cb.name created_by_name,
          (select count(*)::int from trial_grants t where t.code_id=pc.id) testes,
          (select count(*)::int from trial_grants t where t.code_id=pc.id and exists (select 1 from subscriptions s join plans p on p.id=s.plan_id where s.user_id=t.user_id and not p.is_free and s.status in ('ativa','inadimplente','carencia'))) convertidos
        from promotion_codes pc join campaigns cp on cp.id=pc.campaign_id left join users ow on ow.id=pc.owner_user_id left join users cb on cb.id=pc.created_by
        where pc.tenant_id=$1 order by pc.created_at desc limit 500`, [u.tenant_id])
      json(res, 200, { cupons: r.rows })
    },
    'GET /api/adm/monetizacao/cupons/historico': async (req, res) => {
      const u = await admin(req, res, json); if (!u) return
      const id = new URL(req.url, 'http://x').searchParams.get('id')
      const r = await q(`select ch.action, ch.before, ch.after, ch.reason, ch.created_at, us.name actor from coupon_changes ch left join users us on us.id=ch.actor_id where ch.tenant_id=$1 and ch.code_id::text=$2 order by ch.id`, [u.tenant_id, String(id)])
      json(res, 200, { historico: r.rows })
    },
    'GET /api/adm/monetizacao/indicacoes': async (req, res) => {
      const u = await admin(req, res, json); if (!u) return
      const r = await q(`select a.id, a.user_id, iu.name indicado, a.referrer_user_id, ru.name indicador, a.source, a.rule, a.attributed_at, a.change_reason, cu.name alterado_por,
          (select count(*)::int from referral_clicks c where c.referrer_user_id=a.referrer_user_id) cliques_indicador
        from referral_attributions a join users iu on iu.id=a.user_id join users ru on ru.id=a.referrer_user_id left join users cu on cu.id=a.changed_by
        where a.tenant_id=$1 order by a.attributed_at desc limit 500`, [u.tenant_id])
      json(res, 200, { indicacoes: r.rows })
    },
    // troca de indicador: SO o admin, com motivo e auditoria (o sistema nunca sobrescreve sozinho)
    'POST /api/adm/monetizacao/indicacoes/alterar': async (req, res) => {
      const u = await admin(req, res, json); if (!u) return
      const b = await readBody(req)
      if (!isUuid(b.user_id) || !isUuid(b.referrer_user_id) || b.user_id === b.referrer_user_id) return json(res, 400, { error: 'Informe o indicado e o novo indicador (diferentes).' })
      if (txt(b.reason).length < 3) return json(res, 400, { error: 'Informe o motivo.' })
      if ((await q('select count(*)::int n from users where id = any($1) and tenant_id=$2', [[b.user_id, b.referrer_user_id], u.tenant_id])).rows[0].n !== 2) return json(res, 404, { error: 'Usuário não encontrado.' })
      const before = (await q('select referrer_user_id from referral_attributions where user_id=$1', [b.user_id])).rows[0]
      await q(`insert into referral_attributions(tenant_id,user_id,referrer_user_id,source,rule,changed_by,change_reason) values($1,$2,$3,'link','ajuste_admin',$4,$5)
        on conflict (user_id) do update set referrer_user_id=excluded.referrer_user_id, rule='ajuste_admin', changed_by=excluded.changed_by, change_reason=excluded.change_reason`, [u.tenant_id, b.user_id, b.referrer_user_id, u.id, txt(b.reason)])
      await audit(u.tenant_id, u.id, 'indicacao.alterada', 'user', b.user_id, { de: before?.referrer_user_id || null, para: b.referrer_user_id, reason: txt(b.reason) })
      json(res, 200, { ok: true })
    },
    'GET /api/adm/monetizacao/conversoes': async (req, res) => {
      const u = await admin(req, res, json); if (!u) return
      const r = await q(`select rc.id, rc.kind, rc.amount_cents, rc.live, rc.created_at, iu.name indicado, ru.name indicador, rc.charge_id
        from referral_conversions rc join referral_attributions a on a.id=rc.attribution_id join users iu on iu.id=a.user_id join users ru on ru.id=a.referrer_user_id
        where rc.tenant_id=$1 order by rc.created_at desc limit 500`, [u.tenant_id])
      json(res, 200, { conversoes: r.rows })
    },
    'GET /api/adm/monetizacao/auditoria': async (req, res) => {
      const u = await admin(req, res, json); if (!u) return
      const r = await q(`select * from (
          select al.created_at, us.name actor, al.action, al.entity, al.entity_id::text, al.data from audit_log al left join users us on us.id=al.actor_id
            where al.tenant_id=$1 and (al.action like 'cupom.%' or al.action like 'campanha.%' or al.action like 'indicacao.%' or al.action like 'monetizacao.%' or al.action like 'assinatura.%' or al.action like 'cobranca.%' or al.action like 'fraude.%')
          union all
          select e.created_at, us.name, 'assinatura_evento.' || e.action, 'subscription', e.subscription_id::text, jsonb_build_object('de', e.from_status, 'para', e.to_status, 'plano_de', e.from_plan, 'plano_para', e.to_plan, 'origem', e.source, 'motivo', e.reason)
            from subscription_events e join subscriptions s on s.id=e.subscription_id left join users us on us.id=e.actor_id where s.tenant_id=$1
        ) x order by created_at desc limit 300`, [u.tenant_id])
      json(res, 200, { auditoria: r.rows })
    }
  }
}
