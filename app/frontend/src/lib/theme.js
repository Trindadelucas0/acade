// V4.1 — tema claro/escuro. Fonte da verdade: users.theme_pref no Postgres (GET/POST /api/me/theme).
// 'system' segue o aparelho (prefers-color-scheme). Nada é guardado em localStorage.
const api = async (...a) => (await import('./api.js')).api(...a)   // import tardio: módulo puro nos testes
let pref = 'system'
const subs = new Set()
const mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: light)') : null
export const resolved = p => (p === 'light' || p === 'dark') ? p : (mq?.matches ? 'light' : 'dark')
export function applyTheme(p = pref) {
  pref = p
  const de = document.documentElement, t = resolved(p)
  de.dataset.theme = t; de.dataset.accent = 'avadesk'
  const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = t === 'light' ? '#f4f5f0' : '#0b0b0c'
  subs.forEach(f => f(pref))
}
mq?.addEventListener?.('change', () => { if (pref === 'system') applyTheme('system') })
export const getThemePref = () => pref
export const onTheme = f => { subs.add(f); return () => subs.delete(f) }
export async function loadTheme() { try { const r = await api('/api/me/theme'); applyTheme(r.theme || 'system') } catch { applyTheme(pref) } }
export async function saveTheme(p) { applyTheme(p); await api('/api/me/theme', { method: 'POST', body: JSON.stringify({ theme: p }) }) }
