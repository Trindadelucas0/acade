// Monetizacao F5: link /convite/CODIGO de indicacao abre o cadastro com o banner do indicador e o campo de cupom.
// Roda SOMENTE contra a pilha de teste (API 8797 / avagym_test), servida pelo gateway em :4459.
import { test, expect } from '@playwright/test'
const PASS = 'e2e-Avadesk-2026'
test('link de indicacao (/convite/CODIGO) abre o cadastro com o convite e o cupom', async ({ page, request, baseURL }) => {
  test.skip(/:4449\b/.test(baseURL), 'nao roda contra o ambiente do Lucas')
  await request.post('/api/test/rate-limit/reset').catch(() => {})
  const terms = (await (await request.get('/api/terms')).json()).terms
  const email = `e2e.ref.${Date.now()}@e2e.local`
  const r = await request.post('/api/auth/register', { headers: { Origin: baseURL }, data: { name: 'Carla Indicadora', email, password: PASS, accept_terms: true, birth_date: '1990-01-01', terms_version: terms?.version, intent: 'profissional',
    contact: { phone: '11976543210', cep: '01310100', street: 'Avenida Paulista', number: '1', complement: '', neighborhood: 'Bela Vista', city: 'São Paulo', uf: 'SP' } } })
  expect(r.status()).toBe(200)
  const tok = (await r.json()).token
  const me = await (await request.get('/api/referral/me', { headers: { Authorization: 'Bearer ' + tok } })).json()
  expect(me.link).toMatch(/\/convite\/[A-Z0-9]{8}$/)
  await page.context().clearCookies()
  await page.goto('/#/convite/' + me.code)
  await expect(page.getByTestId('ref-banner')).toContainText('Carla')
  await expect(page.getByTestId('signup-coupon')).toBeVisible()
  // o primeiro indicador fica guardado por 30 dias
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('avagym_ref') || 'null'))
  expect(saved.code).toBe(me.code)
})
