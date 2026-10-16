// Monetizacao F5: link /convite/CODIGO (indicacao x convite do personal), cliques, atribuicao no cadastro, D5.
// SOMENTE no banco de TESTE: API=http://localhost:8797 DB_NAME=avagym_test
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import '../env.js'
import { pool } from '../db/pool.js'
const B = process.env.API || 'http://localhost:8797', PASS = process.env.E2E_PASSWORD || 'e2e-Avadesk-2026'
if (!/_test$/.test(process.env.DB_NAME || '')) throw new Error('Recusado: rode com DB_NAME=<banco>_test')
if (/:(4449|8787)\b/.test(B)) throw new Error('Recusado: API de desenvolvimento do Lucas')
async function call(tok, method, p, body, headers = {}) {
  const r = await fetch(B + p, { method, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined })
  let d = {}; try { d = await r.json() } catch { /* */ }
  return { s: r.status, d }
}
const login = async email => (await call(null, 'POST', '/api/auth/login', { email, password: PASS })).d.token
const uniq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
let seq = 0
const newPhone = () => '1197' + String(Date.now() % 1e7 + (++seq)).padStart(7, '0').slice(-7)
async function conta(tag, { intent = 'aluno', phone = newPhone(), ref } = {}) {
  await call(null, 'POST', '/api/test/rate-limit/reset')
  const terms = (await call(null, 'GET', '/api/terms')).d.terms
  const email = `ref.${tag}.${uniq()}@e2e.local`
  const r = await call(null, 'POST', '/api/auth/register', { name: 'Ref ' + tag + ' Silva', email, password: PASS, accept_terms: true, birth_date: '1990-01-01', terms_version: terms?.version, intent, ...(ref ? { ref } : {}),
    contact: { phone, cep: '01310100', street: 'Avenida Paulista', number: '1000', complement: '', neighborhood: 'Bela Vista', city: 'São Paulo', uf: 'SP' } })
  assert.equal(r.s, 200, JSON.stringify(r.d)); return { tok: r.d.token, id: r.d.user.id, email, phone }
}
let adm
const setMon = on => call(adm, 'POST', '/api/adm/billing/settings', { monetizacao_ativa: on })
after(async () => { if (adm) await setMon(false); await pool.end() })

test('preparacao', async () => { adm = await login('admin.e2e@avadesk.local'); assert.ok(adm); assert.equal((await setMon(false)).s, 200) })

let p, link
test('painel do indicador gera codigo e link /convite/CODIGO', async () => {
  p = await conta('pers', { intent: 'profissional' })
  const r = await call(p.tok, 'GET', '/api/referral/me'); assert.equal(r.s, 200, JSON.stringify(r.d))
  assert.match(r.d.link, /\/convite\/[A-Z0-9]{8}$/); link = r.d
  assert.equal((await call(p.tok, 'GET', '/api/referral/me')).d.code, link.code, 'codigo estavel')
})
test('/api/convite e publico: resolve indicacao, conta 1 clique por visitante/dia; desconhecido = 404 generico', async () => {
  const r = await call(null, 'GET', '/api/convite?code=' + link.code, null, { 'x-visitor-id': 'v1' }); assert.equal(r.s, 200); assert.equal(r.d.type, 'indicacao')
  assert.equal(r.d.referrer.first_name, 'Ref'); assert.equal(r.d.referrer.email, undefined)
  await call(null, 'GET', '/api/convite?code=' + link.code, null, { 'x-visitor-id': 'v1' })
  await call(null, 'GET', '/api/convite?code=' + link.code.toLowerCase(), null, { 'x-visitor-id': 'v2' })
  assert.equal((await pool.query('select count(*)::int n from referral_clicks where referrer_user_id=$1', [p.id])).rows[0].n, 2)
  const x = await call(null, 'GET', '/api/convite?code=NAOEXISTE99'); assert.equal(x.s, 404); assert.equal(x.d.code, 'INVITE_NOT_FOUND')
})
test('/convite/CODIGO de convite do personal continua sendo convite (servidor decide)', async () => {
  const inv = (await pool.query(`select code from pro_invites order by created_at desc limit 1`)).rows[0]
  if (!inv) return
  const r = await call(null, 'GET', '/api/convite?code=' + inv.code); assert.equal(r.s, 200); assert.equal(r.d.type, 'convite_personal')
})
let a1
test('cadastro pelo link atribui ao indicador; o primeiro indicador nao e sobrescrito por cupom de outro', async () => {
  a1 = await conta('ind1', { ref: link.code })
  const at = (await pool.query('select referrer_user_id, source from referral_attributions where user_id=$1', [a1.id])).rows
  assert.equal(at.length, 1); assert.equal(at[0].referrer_user_id, p.id); assert.equal(at[0].source, 'link')
  const other = await conta('outro', { intent: 'profissional' })
  const camp = (await call(adm, 'POST', '/api/adm/billing/campaigns', { name: 'Ref ' + uniq(), kind: 'oficial', benefit: 'trial', status: 'ativa' })).d.campaign.id
  const code = ('R' + uniq()).toUpperCase().slice(0, 16)
  assert.equal((await call(adm, 'POST', '/api/adm/billing/codes', { campaign_id: camp, code, kind: 'indicacao', owner_user_id: other.id })).s, 201)
  assert.equal((await call(a1.tok, 'POST', '/api/billing/coupon/redeem', { code })).s, 201)   // ganha o teste (D2)...
  const after = (await pool.query('select referrer_user_id from referral_attributions where user_id=$1', [a1.id])).rows
  assert.equal(after.length, 1); assert.equal(after[0].referrer_user_id, p.id)                   // ...mas o indicador continua o primeiro
})
test('autoindicacao pelo link (mesmo telefone) nao atribui e gera alerta', async () => {
  const me = await conta('selfref', { phone: p.phone, ref: link.code })
  assert.equal((await pool.query('select 1 from referral_attributions where user_id=$1', [me.id])).rowCount, 0)
  assert.ok((await pool.query(`select 1 from fraud_signals where user_id=$1 and kind='autoindicacao_mesmo_telefone'`, [me.id])).rowCount)
})
test('D5: o indicador ve nome, @, data e status; nunca telefone ou e-mail', async () => {
  const r = await call(p.tok, 'GET', '/api/referral/me')
  assert.equal(r.d.cadastros, 1); assert.equal(r.d.testes, 1); assert.equal(r.d.cliques, 2)
  const pe = r.d.pessoas[0]; assert.equal(pe.status, 'teste'); assert.ok(pe.name); assert.ok('handle' in pe); assert.ok(pe.cadastro)
  const flat = JSON.stringify(r.d); assert.ok(!flat.includes(a1.email)); assert.ok(!flat.includes(a1.phone))
})
test('codigo de referral invalido no cadastro e ignorado (nao bloqueia a conta)', async () => {
  const u = await conta('lixo', { ref: 'XXXXXXXX' })
  assert.equal((await pool.query('select 1 from referral_attributions where user_id=$1', [u.id])).rowCount, 0)
})
test('com monetizacao ligada, o painel de indicacoes exige acesso; o /api/convite publico continua', async () => {
  const u = await conta('semacesso', { intent: 'profissional' })
  await setMon(true)
  try {
    assert.equal((await call(u.tok, 'GET', '/api/referral/me')).s, 402)
    assert.equal((await call(null, 'GET', '/api/convite?code=' + link.code)).s, 200)
  } finally { await setMon(false) }
})
