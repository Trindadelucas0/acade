// AVADESK Fitness — Comunidade: feed de profissionais autorizados (cronológico), curtidas, comentários (alunos conforme
// configuração do admin), seguir profissionais, denúncias e moderação registrada. Alunos não publicam nem enviam fotos.
import { coachOf } from './accounts-v42.js'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { q } from './db/pool.js'
import { requireAuth, audit } from './auth.js'
import { getSettings, notify } from './pro.js'
import { extTarget, extDecide } from './challenge-feed.js'

const UP = path.join(path.dirname(fileURLToPath(import.meta.url)), 'uploads')
const qs = req => new URL(req.url, 'http://x').searchParams
const isUuid = s => /^[0-9a-f-]{36}$/i.test(String(s || ''))
const has = (u, r) => u.roles.includes(r)
const txt = (s, n = 2000) => String(s ?? '').trim().slice(0, n)
const EXT = ['ch_post', 'ch_comment', 'challenge', 'group', 'user', 'proof']
const REASONS = ['ofensivo', 'prejudicial', 'privado', 'spam', 'outro']
const PAIN_RE = /\b(dor|doendo|doeu|dói|lesão|lesionei|machuquei|desconforto|inchad)/i
const POST_LIMIT_DAY = 5
async function canPublish(u) {
  if (has(u, 'admin')) return true
  if (!has(u, 'profissional')) return false
  const p = (await q('select state, can_publish from professional_profiles where user_id=$1', [u.id])).rows[0]
  return !!p && p.state === 'ativo' && p.can_publish
}
const FEED_SQL = `select p.id,p.title,p.body,p.category,p.image_url,p.status,p.created_at,p.edited_at,p.author_id,
  coalesce(pp.display_name,a.name) author_name, pp.photo_url author_photo, has_admin.is_admin author_admin,
  coalesce((select array_agg(distinct coalesce(q.area,q.kind)) from professional_qualifications q where q.user_id=p.author_id and q.status='verificada'),'{}') verified,
  (select count(*) from post_likes l where l.post_id=p.id)::int likes, exists(select 1 from post_likes l where l.post_id=p.id and l.user_id=$2) liked,
  (select count(*) from post_comments c where c.post_id=p.id and c.status='visivel')::int comments
  from posts p join users a on a.id=p.author_id left join professional_profiles pp on pp.user_id=a.id
  left join lateral (select exists(select 1 from user_roles r where r.user_id=a.id and r.role_id='admin') is_admin) has_admin on true`

export function communityRoutes({ json, readBody }) {
  return {
    'GET /api/feed/categories': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      const [c, s] = await Promise.all([q('select id,name_pt from feed_categories where active order by position'), getSettings(u.tenant_id)])
      json(res, 200, { categories: c.rows, can_publish: await canPublish(u), can_comment: has(u, 'profissional') || has(u, 'admin') || !!s.comentarios_alunos })
    },
    'GET /api/feed': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      const cat = qs(req).get('cat'), author = qs(req).get('author'), mine = qs(req).get('mine') === '1', following = qs(req).get('following') === '1'
      const before = qs(req).get('before')
      const params = [u.tenant_id, u.id]; const w = []
      { const cc = coachOf(u); if (cc) { params.push(cc); w.push(`p.author_id=$${params.length}`) } }   // V4.2: aluno do personal vê a comunidade do personal
      if (mine) w.push(`p.author_id=$2 and p.status in ('publicado','rascunho','oculto')`)
      else w.push(`p.status='publicado'`)
      if (cat) { params.push(cat); w.push(`p.category=$${params.length}`) }
      if (isUuid(author)) { params.push(author); w.push(`p.author_id=$${params.length}`) }
      if (following) w.push(`exists(select 1 from follows f where f.follower_id=$2 and f.professional_id=p.author_id)`)
      if (before && !isNaN(Date.parse(before))) { params.push(new Date(before)); w.push(`p.created_at < $${params.length}`) }
      const r = await q(FEED_SQL + ` where p.tenant_id=$1 and ${w.join(' and ')} order by p.created_at desc limit 20`, params)
      json(res, 200, { posts: r.rows })
    },
    'GET /api/post': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      const id = qs(req).get('id'); if (!isUuid(id)) return json(res, 400, { error: 'id inválido' })
      const p = (await q(FEED_SQL + ' where p.id=$1 and p.tenant_id=$3', [id, u.id, u.tenant_id])).rows[0]
      if (!p || (p.status !== 'publicado' && p.author_id !== u.id && !has(u, 'admin'))) return json(res, 404, { error: 'Esta publicação não está mais disponível.' })
      const c = await q(`select c.id,c.body,c.status,c.created_at,c.edited_at,c.author_id, coalesce(pp.display_name,a.name) author_name,
          exists(select 1 from user_roles r where r.user_id=a.id and r.role_id='profissional') author_pro, (c.author_id=$2) mine
        from post_comments c join users a on a.id=c.author_id left join professional_profiles pp on pp.user_id=a.id
        where c.post_id=$1 and (c.status='visivel' or $3) order by c.id`, [id, u.id, has(u, 'admin')])
      json(res, 200, { post: p, comments: c.rows })
    },
    'POST /api/posts': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      if (!(await canPublish(u))) return json(res, 403, { error: 'Somente profissionais ativos e autorizados pela administração podem publicar.' })
      const b = await readBody(req)
      const title = txt(b.title, 140), body = txt(b.body, 5000), status = b.status === 'rascunho' ? 'rascunho' : 'publicado'
      if (title.length < 3 || body.length < 3) return json(res, 400, { error: 'Informe título e conteúdo' })
      const cat = (await q('select id from feed_categories where id=$1 and active', [b.category])).rows[0]?.id || null
      const img = b.image_url && /^\/api\/media\?f=[\w.-]+$/.test(b.image_url) ? b.image_url : null
      if (b.id) {
        const p = (await q('select * from posts where id=$1', [b.id])).rows[0]
        if (!p || p.author_id !== u.id) return json(res, 403, { error: 'Você só edita as próprias publicações' })
        if (p.status === 'removido') return json(res, 409, { error: 'Publicação removida pela moderação' })
        const nst = p.status === 'oculto' ? 'oculto' : status
        await q('update posts set title=$2, body=$3, category=$4, image_url=$5, status=$6, updated_at=now(), edited_at=now() where id=$1', [p.id, title, body, cat, img, nst])
        await audit(u.tenant_id, u.id, 'post.editado', 'post', p.id)
        return json(res, 200, { id: p.id })
      }
      if (status === 'publicado' && !has(u, 'admin')) {
        const n = +(await q(`select count(*) from posts where author_id=$1 and status<>'rascunho' and created_at > now() - interval '24 hours'`, [u.id])).rows[0].count
        const lim = +(await getSettings(u.tenant_id)).limite_publicacoes_dia || POST_LIMIT_DAY
        if (n >= lim) return json(res, 429, { error: `Limite de ${lim} publicações por dia atingido.` })
      }
      const r = await q('insert into posts(tenant_id,author_id,title,body,category,image_url,status) values($1,$2,$3,$4,$5,$6,$7) returning id', [u.tenant_id, u.id, title, body, cat, img, status])
      await audit(u.tenant_id, u.id, 'post.' + status, 'post', r.rows[0].id)
      if (status === 'publicado') {
        const f = await q('select follower_id from follows where professional_id=$1 limit 500', [u.id])
        for (const x of f.rows) await notify(x.follower_id, 'feed', `Nova publicação de ${u.name}`, title, '/post/' + r.rows[0].id)
      }
      json(res, 201, { id: r.rows[0].id })
    },
    'POST /api/posts/delete': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      const b = await readBody(req)
      const p = isUuid(b.id) && (await q('select * from posts where id=$1', [b.id])).rows[0]
      if (!p || (p.author_id !== u.id && !has(u, 'admin'))) return json(res, 403, { error: 'Sem permissão' })
      await q(`update posts set status='removido', moderation_reason=$2, updated_at=now() where id=$1`, [p.id, p.author_id === u.id ? 'excluída pelo autor' : txt(b.reason, 300)])
      await audit(u.tenant_id, u.id, 'post.removido', 'post', p.id, { by_author: p.author_id === u.id })
      json(res, 200, { ok: true })
    },
    // curtida idempotente: no máximo uma por usuário (PK), cliques repetidos não duplicam
    'POST /api/posts/like': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      const b = await readBody(req)
      if (!isUuid(b.id) || !(await q(`select 1 from posts where id=$1 and status='publicado' and tenant_id=$2`, [b.id, u.tenant_id])).rowCount) return json(res, 404, { error: 'Publicação indisponível' })
      if (b.on === false) await q('delete from post_likes where post_id=$1 and user_id=$2', [b.id, u.id])
      else await q('insert into post_likes(post_id,user_id) values($1,$2) on conflict do nothing', [b.id, u.id])
      const n = +(await q('select count(*) from post_likes where post_id=$1', [b.id])).rows[0].count
      json(res, 200, { likes: n, liked: b.on !== false })
    },
    'POST /api/comments': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      const b = await readBody(req), body = txt(b.body, 1500)
      const s = await getSettings(u.tenant_id)
      const staff = has(u, 'profissional') || has(u, 'admin')
      if (!staff && !s.comentarios_alunos) return json(res, 403, { error: 'Comentários de alunos estão desativados pela administração.' })
      if (staff && has(u, 'profissional') && !has(u, 'admin')) { const p = (await q('select state from professional_profiles where user_id=$1', [u.id])).rows[0]; if (!p || p.state !== 'ativo') return json(res, 403, { error: 'Perfil profissional não ativo' }) }
      if (body.length < 1) return json(res, 400, { error: 'Comentário vazio' })
      const p = isUuid(b.post_id) && (await q(`select id, author_id from posts where id=$1 and status='publicado' and tenant_id=$2`, [b.post_id, u.tenant_id])).rows[0]
      if (!p) return json(res, 404, { error: 'Publicação indisponível' })
      const r = await q('insert into post_comments(post_id,author_id,body) values($1,$2,$3) returning id', [p.id, u.id, body])
      if (p.author_id !== u.id) await notify(p.author_id, 'feed', 'Novo comentário na sua publicação', body.slice(0, 80), '/post/' + p.id)
      // relato individual de dor no feed: orientar para o canal certo (sem diagnóstico, sem resposta pública substituta)
      json(res, 201, { id: r.rows[0].id, hint: PAIN_RE.test(body) ? 'Para uma situação individual de dor ou desconforto, use “Relatar problema” no treino ou em Acompanhamento — seu profissional responde por lá.' : null })
    },
    'POST /api/comments/delete': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      const b = await readBody(req)
      const c = (await q('select * from post_comments where id=$1', [+b.id])).rows[0]
      if (!c || (c.author_id !== u.id && !has(u, 'admin'))) return json(res, 403, { error: 'Sem permissão' })
      await q(`update post_comments set status='removido' where id=$1`, [c.id])
      await audit(u.tenant_id, u.id, 'comentario.removido', 'comment', c.id, { by_author: c.author_id === u.id })
      json(res, 200, { ok: true })
    },
    'POST /api/reports': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      const b = await readBody(req)
      if (!['post', 'comment', ...EXT].includes(b.target_type) || !REASONS.includes(b.reason)) return json(res, 400, { error: 'Escolha um motivo' })
      if ((await q(`select 1 from content_reports where reporter_id=$1 and target_type=$2 and target_id=$3 and status<>'resolvida'`, [u.id, b.target_type, String(b.target_id)])).rowCount) return json(res, 200, { ok: true, duplicate: true })
      const r = await q('insert into content_reports(tenant_id,target_type,target_id,reporter_id,reason,details) values($1,$2,$3,$4,$5,$6) returning id', [u.tenant_id, b.target_type, String(b.target_id).slice(0, 64), u.id, b.reason, txt(b.details, 1000) || null])
      await audit(u.tenant_id, u.id, 'denuncia.criada', 'report', r.rows[0].id)
      json(res, 201, { ok: true, message: 'Denúncia enviada. A administração vai avaliar — o conteúdo não é removido automaticamente.' })
    },
    // seguir profissionais (não cria vínculo de acompanhamento)
    'POST /api/follows': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      const b = await readBody(req)
      if (!isUuid(b.professional_id) || b.professional_id === u.id || !(await q(`select 1 from professional_profiles where user_id=$1 and state in ('ativo','suspenso')`, [b.professional_id])).rowCount) return json(res, 404, { error: 'Profissional não encontrado' })
      if (b.on === false) await q('delete from follows where follower_id=$1 and professional_id=$2', [u.id, b.professional_id])
      else await q('insert into follows(follower_id,professional_id) values($1,$2) on conflict do nothing', [u.id, b.professional_id])
      json(res, 200, { following: b.on !== false })
    },
    // foto das publicações (somente quem pode publicar). Armazenamento local em api/uploads.
    'POST /api/uploads': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      if (!(await canPublish(u))) return json(res, 403, { error: 'Somente profissionais autorizados enviam imagens' })
      const b = await readBody(req)
      const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ''))
      if (!m) return json(res, 400, { error: 'Envie PNG, JPEG ou WEBP' })
      const buf = Buffer.from(m[2], 'base64')
      if (buf.length > 2.5 * 1024 * 1024) return json(res, 413, { error: 'Imagem acima de 2,5 MB' })
      const magic = buf.subarray(0, 12).toString('hex')
      if (!(magic.startsWith('89504e47') || magic.startsWith('ffd8ff') || (magic.startsWith('52494646') && buf.subarray(8, 12).toString() === 'WEBP'))) return json(res, 400, { error: 'Arquivo de imagem inválido' })
      fs.mkdirSync(UP, { recursive: true })
      const name = crypto.randomBytes(12).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1])
      fs.writeFileSync(path.join(UP, name), buf)
      json(res, 201, { url: '/api/media?f=' + name })
    },
    'GET /api/media': async (req, res) => {
      const f = qs(req).get('f') || ''
      if (!/^[a-f0-9]{24}\.(png|jpg|webp|gif|mp4|webm)$/.test(f) || !fs.existsSync(path.join(UP, f))) return json(res, 404, { error: 'not found' })
      const file = path.join(UP, f), size = fs.statSync(file).size
      const type = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm' }[f.split('.')[1]]
      const h = { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes' }
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
      if (m) {   // vídeo: suporte a Range para o player poder avançar/voltar
        const start = m[1] ? +m[1] : Math.max(0, size - +m[2]), end = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1
        if (start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); return res.end() }
        res.writeHead(206, { ...h, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 })
        return fs.createReadStream(file, { start, end }).pipe(res)
      }
      res.writeHead(200, { ...h, 'Content-Length': size })
      fs.createReadStream(file).pipe(res)
    },

    // ---------- moderação (admin) ----------
    'GET /api/adm/reports': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      if (!has(u, 'admin')) return json(res, 403, { error: 'Sem permissão' })
      const st = qs(req).get('status') || 'pendente'
      const r = await q(`select r.*, x.name reporter, case when r.target_type='post' then (select json_build_object('title',p.title,'body',left(p.body,300),'status',p.status,'author',a.name,'author_id',p.author_id) from posts p join users a on a.id=p.author_id where p.id::text=r.target_id)
          else (select json_build_object('body',c.body,'status',c.status,'author',a.name,'author_id',c.author_id,'post_id',c.post_id) from post_comments c join users a on a.id=c.author_id where c.id::text=r.target_id) end target
        from content_reports r join users x on x.id=r.reporter_id where r.tenant_id=$1 and r.status=$2 order by r.created_at`, [u.tenant_id, st])
      for (const x of r.rows) if (EXT.includes(x.target_type)) { const t = await extTarget(x.target_type, x.target_id, u.tenant_id); x.target = t && { body: t.body, status: t.status, author_id: t.author_id, challenge_id: t.challenge_id } }
      json(res, 200, { reports: r.rows })
    },
    'POST /api/adm/reports/decide': async (req, res) => {
      const u = await requireAuth(req, res, json); if (!u) return
      if (!has(u, 'admin')) return json(res, 403, { error: 'Sem permissão' })
      const b = await readBody(req), reason = txt(b.reason, 500)
      if (!['manter', 'correcao', 'ocultar', 'remover', 'restringir', 'em_analise'].includes(b.decision)) return json(res, 400, { error: 'Decisão inválida' })
      if (b.decision !== 'em_analise' && reason.length < 3) return json(res, 400, { error: 'Registre o motivo da decisão' })
      const r = (await q('select * from content_reports where id=$1 and tenant_id=$2', [+b.id, u.tenant_id])).rows[0]
      if (!r) return json(res, 404, { error: 'Denúncia não encontrada' })
      if (EXT.includes(r.target_type)) {
        if (b.decision === 'em_analise') { await q(`update content_reports set status='em_analise' where id=$1`, [r.id]); return json(res, 200, { ok: true }) }
        const t = await extTarget(r.target_type, r.target_id, u.tenant_id)
        await extDecide(r.target_type, t, b.decision, reason, u)
        if (t && t.author_id && b.decision !== 'manter') await notify(t.author_id, 'moderacao', 'Moderação: ' + b.decision, reason, t.challenge_id ? '/desafio/' + t.challenge_id : '/comunidade')
        await q(`update content_reports set status='resolvida', decision=$2, decided_by=$3, decision_reason=$4, decided_at=now() where id=$1`, [r.id, b.decision, u.id, reason])
        await audit(u.tenant_id, u.id, 'moderacao.' + b.decision, r.target_type, r.target_id, { report: r.id, reason })
        return json(res, 200, { ok: true })
      }
      const t = r.target_type === 'post' ? (await q('select id, author_id from posts where id::text=$1', [r.target_id])).rows[0] : (await q('select id, author_id from post_comments where id::text=$1', [r.target_id])).rows[0]
      if (b.decision === 'em_analise') { await q(`update content_reports set status='em_analise' where id=$1`, [r.id]); return json(res, 200, { ok: true }) }
      if (t && ['ocultar', 'remover'].includes(b.decision)) {
        const st = r.target_type === 'post' ? (b.decision === 'ocultar' ? 'oculto' : 'removido') : (b.decision === 'ocultar' ? 'oculto' : 'removido')
        if (r.target_type === 'post') await q('update posts set status=$2, moderation_reason=$3 where id=$1', [t.id, st, reason])
        else await q('update post_comments set status=$2 where id=$1', [t.id, st])
      }
      if (t && b.decision === 'restringir') await q('update professional_profiles set can_publish=false where user_id=$1', [t.author_id])
      if (t && ['correcao', 'ocultar', 'remover', 'restringir'].includes(b.decision)) await notify(t.author_id, 'moderacao', 'Moderação da comunidade: ' + b.decision, reason, '/comunidade')
      await q(`update content_reports set status='resolvida', decision=$2, decided_by=$3, decision_reason=$4, decided_at=now() where id=$1`, [r.id, b.decision, u.id, reason])
      await audit(u.tenant_id, u.id, 'moderacao.' + b.decision, r.target_type, r.target_id, { report: r.id, reason })
      json(res, 200, { ok: true })
    }
  }
}
