// AVAGYM V5 - molduras #TáPago desenhadas em canvas no aparelho, só com dados elegíveis devolvidos pelo servidor.
import { fmtDur, fmtVol, WEEKDAYS, initials } from './socialRules.js'
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
// indicadores exibidos: valores ausentes não aparecem (nunca inventa número)
export function cardStats(kind, data = {}) {
  if (kind === 'treino') return [['Tempo', fmtDur(data.duration_sec)], ['Exercícios', data.exercises ?? null], ['Séries', data.sets ?? null], ['Volume', fmtVol(data.volume_kg)]].filter(([, v]) => v != null && v !== '')
  if (kind === 'semana') return [['Treinos', data.workouts], ['Minutos', data.minutes], ['Séries', data.sets]].filter(([, v]) => v != null)
  return []
}
function wrap(ctx, text, maxW, maxLines) {
  const lines = []; let cur = ''
  for (const w of String(text || '').split(/\s+/)) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w } else cur = t }
  if (cur) lines.push(cur)
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…' }
  return lines
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath() }

export function drawCard(ctx, { kind, data = {}, who, showStats = true, showWho = true, avatar = null, accent = '#b6f23a' }) {
  const W = ctx.canvas.width, H = ctx.canvas.height, P = 80, tall = H / W > 1.5
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0d1117'); g.addColorStop(1, '#1b2535'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = accent; ctx.fillRect(0, 0, W, 14)
  ctx.textBaseline = 'top'; ctx.textAlign = 'left'
  ctx.fillStyle = accent; ctx.font = `800 ${tall ? 120 : 100}px ${FONT}`; ctx.fillText('#TáPago', P, P)
  ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.font = `600 34px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText('AVAGYM', W - P, P + 10); ctx.textAlign = 'left'
  let y = P + (tall ? 210 : 160)
  const title = kind === 'treino' ? data.workout_name || 'Treino concluído' : kind === 'semana' ? 'Minha semana' : 'Músculos da semana'
  ctx.fillStyle = '#fff'; ctx.font = `700 ${tall ? 78 : 66}px ${FONT}`
  for (const line of wrap(ctx, title, W - 2 * P, 2)) { ctx.fillText(line, P, y); y += tall ? 92 : 78 }
  const sub = kind === 'treino' && data.date ? new Date(data.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    : kind === 'semana' && data.week_start ? 'Semana de ' + new Date(data.week_start + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : 'Últimos 7 dias'
  ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = `500 36px ${FONT}`; ctx.fillText(sub, P, y + 6); y += 84
  if (kind === 'semana') {
    const r = 46, gap = (W - 2 * P - 14 * r) / 6
    WEEKDAYS.forEach((l, i) => {
      const cx = P + r + i * (2 * r + gap), on = (data.days || []).includes(i + 1)
      ctx.beginPath(); ctx.arc(cx, y + r, r, 0, Math.PI * 2); ctx.fillStyle = on ? accent : 'rgba(255,255,255,.12)'; ctx.fill()
      ctx.fillStyle = on ? '#0d1117' : 'rgba(255,255,255,.75)'; ctx.font = `700 34px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(on ? '✓' : l, cx, y + r); ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    })
    y += 2 * r + 50
  }
  const stats = showStats ? cardStats(kind, data) : []
  if (stats.length) {
    const cols = stats.length > 2 ? 2 : stats.length, cw = (W - 2 * P - (cols - 1) * 24) / cols, ch = tall ? 180 : 150
    stats.forEach(([k, v], i) => {
      const x = P + (i % cols) * (cw + 24), yy = y + Math.floor(i / cols) * (ch + 24)
      ctx.fillStyle = 'rgba(255,255,255,.08)'; roundRect(ctx, x, yy, cw, ch, 28); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = `800 ${tall ? 76 : 64}px ${FONT}`; ctx.fillText(String(v), x + 32, yy + 26)
      ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = `500 32px ${FONT}`; ctx.fillText(k, x + 32, yy + ch - 58)
    })
    y += Math.ceil(stats.length / cols) * (ch + 24) + 20
  }
  const reserve = showWho ? 230 : 120, mus = (data.muscles || []).filter(m => m.score > 0)
  if (kind === 'musculos') {
    if (!mus.length) { ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = `500 40px ${FONT}`; for (const line of wrap(ctx, 'Nenhum treino válido nos últimos 7 dias.', W - 2 * P, 2)) { ctx.fillText(line, P, y); y += 52 } }
    const max = Math.max(1, ...mus.map(m => m.score))
    for (const m of mus) {
      if (y > H - reserve - 90) break
      ctx.fillStyle = '#fff'; ctx.font = `600 36px ${FONT}`; ctx.fillText(m.name, P, y)
      ctx.fillStyle = 'rgba(255,255,255,.12)'; roundRect(ctx, P, y + 50, W - 2 * P, 22, 11); ctx.fill()
      ctx.fillStyle = accent; roundRect(ctx, P, y + 50, Math.max(22, (W - 2 * P) * (m.score / max)), 22, 11); ctx.fill()
      y += 112
    }
  } else if (mus.length && y < H - reserve - 150) {
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = `500 34px ${FONT}`; ctx.fillText('Músculos trabalhados', P, y); y += 50
    ctx.fillStyle = '#fff'; ctx.font = `600 40px ${FONT}`
    for (const line of wrap(ctx, mus.map(m => m.name).join(' · '), W - 2 * P, 2)) { ctx.fillText(line, P, y); y += 52 }
  }
  const fy = H - P - 120
  if (showWho && who) {
    const r = 55
    ctx.save(); ctx.beginPath(); ctx.arc(P + r, fy + r, r, 0, Math.PI * 2); ctx.closePath()
    if (avatar) { ctx.clip(); ctx.drawImage(avatar, P, fy, 2 * r, 2 * r) }
    else { ctx.fillStyle = accent; ctx.fill(); ctx.fillStyle = '#0d1117'; ctx.font = `800 44px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(initials(who.name), P + r, fy + r) }
    ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'top'
    ctx.fillStyle = '#fff'; ctx.font = `700 40px ${FONT}`; ctx.fillText(who.name || '', P + 2 * r + 28, fy + 14)
    if (who.handle) { ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = `500 32px ${FONT}`; ctx.fillText('@' + who.handle, P + 2 * r + 28, fy + 64) }
  }
  ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = `500 28px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText('treino registrado no AVAGYM', W - P, H - P); ctx.textAlign = 'left'
}