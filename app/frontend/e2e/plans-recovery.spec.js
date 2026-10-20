import { test, expect } from '@playwright/test'

const plan = { id: 'individual', audience: 'aluno', product: 'individual', name: 'Individual', description: 'Treino completo', price_cents: 1290, currency: 'BRL', billing_interval: 'mensal', benefits: [], limits: {}, features: {}, is_free: false, purchasable: true }

test('página de preços explica falha temporária e permite carregar novamente', async ({ page }) => {
  let calls = 0
  await page.route('**/api/public/plans', route => ++calls <= 2
    ? route.fulfill({ status: 502, json: { error: 'upstream unavailable' } })
    : route.fulfill({ json: { plans: [plan], test_mode: false, hosted_checkout: true, payment_types: ['card', 'pix'] } }))

  await page.goto('/#/precos')
  await expect(page.getByTestId('public-plans-error')).toContainText('temporariamente indisponíveis')
  await expect(page.getByTestId('public-plans-error')).not.toContainText('HTTP 502')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByTestId('plan-card-individual')).toBeVisible()
  expect(calls).toBeGreaterThanOrEqual(3)
})

test('opções do campo UF têm contraste nos temas escuro e claro', async ({ page }) => {
  await page.goto('/#/?cadastro=1')
  await page.getByLabel('Nome', { exact: false }).first().fill('Teste Visual')
  await page.getByLabel('E-mail').fill('visual@e2e.local')
  const passwords = page.locator('input[type=password]')
  await passwords.nth(0).fill('e2e-Avadesk-2026')
  await passwords.nth(1).fill('e2e-Avadesk-2026')
  await page.getByTestId('signup-next').click()

  const uf = page.getByTestId('ct-uf')
  await expect(uf).toBeVisible()
  for (const theme of ['dark', 'light']) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme)
    const colors = await uf.locator('option').nth(1).evaluate(option => {
      const style = getComputedStyle(option)
      return { background: style.backgroundColor, color: style.color }
    })
    expect(colors.background).not.toBe(colors.color)
  }
})
