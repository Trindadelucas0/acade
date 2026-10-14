// Cliente do backend AVADESK (login por e-mail e senha).
export const IS_APPLE = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
export const IS_ANDROID = /Android/.test(navigator.userAgent)
export const BIO = IS_APPLE ? 'Face ID / Touch ID' : IS_ANDROID ? 'fingerprint or face unlock' : 'your fingerprint, face or PIN'
export const VAULT = IS_APPLE ? 'iCloud Keychain' : IS_ANDROID ? 'Google Password Manager' : 'your password manager'

const API_BASE = import.meta.env.VITE_API_BASE || ''

export async function api(path, opts) {
  const url = path.startsWith('http') ? path : (API_BASE + path)
  const r = await fetch(url, Object.assign({ credentials: 'include', headers: { 'Content-Type': 'application/json' } }, opts))
  const data = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(data.error || ('HTTP ' + r.status)); e.status = r.status; e.errors = data.errors; throw e }
  return data
}

// Login AVAGYM por e-mail + senha (JWT em cookie httpOnly; o token também volta no corpo p/ uso Bearer em apps).
export async function authLogin(email, password) {
  const r = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  return r.user
}
export async function authRegister(name, email, password) {
  const r = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
  return r.user
}
