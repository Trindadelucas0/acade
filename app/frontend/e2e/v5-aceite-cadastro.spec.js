// BUG-019: tela inicial deslogada = Login; aceite (Termos+Privacidade, 18+, saude opcional) no cadastro;
// sem gate de termos logo apos o cadastro. BUG-020: cabecalhos de seguranca do gateway nao quebram o app.
// Roda SOMENTE contra a pilha de teste (API 8797 / avagym_test), servida pelo gateway em :4459.
import { test, expect } from '@playwright/test'
const PASS = 'e2e-Avadesk-2026'
test('raiz abre o Login; cadastro com aceite entra direto, sem gate de termos', async ({ page, baseURL }) => {
  test.skip(/:4449\b/.test(baseURL), 'nao roda contra o ambiente do Lucas')
  const csp = []; page.on('console', m => { if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text()) })
  const resp = await page.goto('/')
  const h = resp.headers()
  if (process.env.EXPECT_SEC_HEADERS) {
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'")
    expect(h['x-frame-options']).toBe('DENY'); expect(h['x-content-type-options']).toBe('nosniff')
    expect(h['referrer-policy']).toBeTruthy(); expect(h['permissions-policy']).toBeTruthy()
  }
  await expect(page.getByRole('button', { name: 'Criar conta' }).first()).toBeVisible({ timeout: 15000 })
  await expect(page.getByTestId('terms-gate')).toHaveCount(0)
  await page.getByRole('button', { name: 'Criar conta' }).first().click()
  await expect(page.getByTestId('intent-aluno')).toBeVisible()
  await expect(page.locator('a[href="#/legal/termos"]')).toBeVisible(); await expect(page.locator('a[href="#/legal/privacidade"]')).toBeVisible()
  const email = `cad.e2e.${Date.now()}@e2e.local`
  await page.getByLabel('Nome', { exact: false }).first().fill('Cadastro Aceite'); await page.getByLabel('E-mail').fill(email)
  const pw = page.locator('input[type=password]'); await pw.nth(0).fill(PASS); if (await pw.count() > 1) await pw.nth(1).fill(PASS)
  await page.getByTestId('accept-terms').check()
  await page.locator('form button[type=submit]').click()
  await expect(page.getByText('Confirme que você tem 18 anos ou mais')).toBeVisible()   // sem 18+ nao cria
  await page.getByTestId('accept-adult').check(); await page.getByTestId('accept-health').check()
  await page.locator('form button[type=submit]').click()
  await expect(page.locator('.lg-field')).toHaveCount(0, { timeout: 15000 })
  await page.waitForTimeout(2000)
  await expect(page.getByTestId('terms-gate')).toHaveCount(0)
  const lm = await (await page.request.get('/api/legal/me')).json(); expect((lm.me || lm).needs_legal).toBeFalsy()
  expect(csp, csp.join('\n')).toEqual([])
})