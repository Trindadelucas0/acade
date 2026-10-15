// AVAGYM V4.2 — e-mail com fila no Postgres (email_outbox). Provedor configurado depois pelo Lucas:
// enquanto SMTP_HOST estiver vazio no .env, os e-mails ficam 'pendente' (nada se perde). Com SMTP configurado,
// o processador envia usando o pacote "nodemailer" (instalar: npm i nodemailer no app/api).
import { q } from './db/pool.js'
export const mailConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_FROM)
export async function enqueueEmail({ tenantId = null, to, cc = null, subject, body, attachment = null, kind = 'geral', ref = null }) {
  const r = await q(`insert into email_outbox(tenant_id,to_email,cc_email,subject,body,attachment_name,attachment_type,attachment,kind,ref) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id,status`,
    [tenantId, to, cc || null, subject, body, attachment?.name || null, attachment?.type || null, attachment?.content || null, kind, ref])
  return r.rows[0]
}
let busy = false
export async function processOutbox(limit = 10) {
  if (busy || !mailConfigured()) return { sent: 0, pending: true }
  busy = true
  let sent = 0
  try {
    let nm; try { nm = (await import('nodemailer')).default } catch { console.error('[mailer] SMTP configurado, mas o pacote nodemailer não está instalado (npm i nodemailer)'); return { sent: 0, error: 'nodemailer ausente' } }
    const tr = nm.createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined })
    const rows = (await q(`update email_outbox set status='enviando', attempts=attempts+1 where id in (select id from email_outbox where status in ('pendente','erro') and attempts < 5 order by id limit $1 for update skip locked) returning *`, [limit])).rows
    for (const m of rows) {
      try {
        await tr.sendMail({ from: process.env.SMTP_FROM, to: m.to_email, cc: m.cc_email || undefined, subject: m.subject, text: m.body,
          attachments: m.attachment ? [{ filename: m.attachment_name, content: m.attachment, contentType: m.attachment_type || 'application/json' }] : undefined })
        await q(`update email_outbox set status='enviado', sent_at=now(), last_error=null where id=$1`, [m.id]); sent++
        if (m.kind === 'lgpd_export') await q(`update data_export_requests set status='enviado' where outbox_id=$1`, [m.id])
      } catch (e) { await q(`update email_outbox set status='erro', last_error=$2 where id=$1`, [m.id, String(e.message).slice(0, 300)]) }
    }
  } finally { busy = false }
  return { sent }
}
export function startMailer() { setInterval(() => processOutbox().catch(e => console.error('[mailer]', e.message)), 60000).unref?.() }
