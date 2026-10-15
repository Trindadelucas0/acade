// AVAGYM V3 · Fase 7 — estado do usuário no PostgreSQL: treino livre (antes state-<id>.json), treino em andamento
// (livre e guiado) e "Agora não" do onboarding. Toda rota exige login (JWT; cookie legado gymsid aceito como ponte).
import fs from 'node:fs'
import path from 'node:path'
import { q } from './db/pool.js'
import { authUser } from './auth.js'

const isUuid = s => /^[0-9a-f-]{36}$/i.test(String(s || ''))
const MAX = 5 * 1024 * 1024   // estado serializado (mesmo teto prático do arquivo antigo)
let DATA = null
const legacyFile = uid => DATA && path.join(DATA, 'state-' + String(uid).replace(/[^a-zA-Z0-9_-]/g, '') + '.json')

export async function writeStatePg(uid, state, active) {
  const st = { ...state }; delete st.active
  await q(`insert into user_app_state(user_id, tenant_id, state, active_workout, client_ts)
      select id, tenant_id, $2, $3, $4 from users where id=$1
    on conflict (user_id) do update set state=excluded.state, active_workout=excluded.active_workout, client_ts=excluded.client_ts, updated_at=now()`,
    [uid, JSON.stringify(st), active ? JSON.stringify(active) : null, Number.isFinite(+st._ts) ? Math.trunc(+st._ts) : null])
}
// lê do banco; se ainda não houver linha mas existir o arquivo legado, importa na hora (uma vez)
export async function readStateRow(uid) {
  if (!isUuid(uid)) return null
  const r = (await q('select state, active_workout from user_app_state where user_id=$1', [uid])).rows[0]
  if (r) return r
  const f = legacyFile(uid)
  if (f && fs.existsSync(f)) {
    try { const st = JSON.parse(fs.readFileSync(f, 'utf8')); await writeStatePg(uid, st, null); return { state: st, active_workout: null } } catch { /* arquivo inválido */ }
  }
  return null
}
export const readStatePg = async uid => (await readStateRow(uid))?.state || null
export async function eraseStatePg(uid) {
  await q('delete from user_app_state where user_id=$1', [uid]); await q('delete from guided_live_sessions where user_id=$1', [uid])
}

export function appStateRoutes({ json, readBody, readSession, dataDir }) {
  DATA = dataDir
  const who = async (req, res) => {
    const u = await authUser(req)
    const id = u ? u.id : readSession(req)?.id
    if (!isUuid(id)) { json(res, 401, { error: 'Não autenticado' }); return null }
    return id
  }
  return {
    'GET /api/data': async (req, res) => {
      const id = await who(req, res); if (!id) return
      const r = await readStateRow(id)
      json(res, 200, { state: r?.state || null, active: r?.active_workout || null })
    },
    'PUT /api/data': async (req, res) => {
      const id = await who(req, res); if (!id) return
      const b = await readBody(req)
      if (!b || !b.state || typeof b.state !== 'object' || Array.isArray(b.state)) return json(res, 400, { error: 'state required' })
      if (JSON.stringify(b.state).length > MAX) return json(res, 413, { error: 'Estado grande demais' })
      const active = b.state.active && typeof b.state.active === 'object' ? b.state.active : null
      await writeStatePg(id, b.state, active)
      json(res, 200, { ok: true, ts: b.state._ts || null })
    },
    // treino guiado / ficha em andamento (retomar em outro aparelho)
    'GET /api/me/live-session': async (req, res) => {
      const id = await who(req, res); if (!id) return
      const r = (await q('select session, updated_at from guided_live_sessions where user_id=$1', [id])).rows[0]
      json(res, 200, { session: r?.session || null, updated_at: r?.updated_at || null })
    },
    'PUT /api/me/live-session': async (req, res) => {
      const id = await who(req, res); if (!id) return
      const b = await readBody(req)
      if (!b?.session || typeof b.session !== 'object' || Array.isArray(b.session)) return json(res, 400, { error: 'session required' })
      if (JSON.stringify(b.session).length > 1024 * 1024) return json(res, 413, { error: 'Sessão grande demais' })
      await q(`insert into guided_live_sessions(user_id, tenant_id, session) select id, tenant_id, $2 from users where id=$1
        on conflict (user_id) do update set session=excluded.session, updated_at=now()`, [id, JSON.stringify(b.session)])
      json(res, 200, { ok: true })
    },
    'POST /api/me/live-session/clear': async (req, res) => {
      const id = await who(req, res); if (!id) return
      await q('delete from guided_live_sessions where user_id=$1', [id])
      json(res, 200, { ok: true })
    },
    'POST /api/me/onboarding/skip': async (req, res) => {
      const id = await who(req, res); if (!id) return
      await q('update users set onboarding_skipped_at=coalesce(onboarding_skipped_at, now()) where id=$1', [id])
      json(res, 200, { ok: true })
    }
  }
}
