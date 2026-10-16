// Kit das personas (SÓ LOCAL: API :8787 + Postgres local, contas fictícias). Cada passo vira um caso de teste com print borrado
// e uma linha em docs/v4/casos-de-teste/resultados-<perfil>.json. Nada é apagado: cada execução cria contas novas.
import { expect } from '@playwright/test'
import fs from 'node:fs'
export const BASE = 'http://localhost:4449', PASS = 'e2e-Avadesk-2026', ADMIN = 'admin.e2e@avadesk.local', PRO_SEED = 'pro1.e2e@avadesk.local'
export const DIR = process.env.CASOS_DIR || '../../docs/v4/casos-de-teste'
export const MOBILE = { width: 390, height: 844 }, DESKTOP = { width: 1280, height: 860 }
const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
export function persona(perfil, prefix) {
  fs.mkdirSync(`${DIR}/prints/${perfil}`, { recursive: true })
  const RES = `${DIR}/resultados-${perfil}.json`; fs.writeFileSync(RES, '[]')
  let n = 0
  return async function step(page, objetivo, fn, extra = {}) {
    const id = `${prefix}-${String(++n).padStart(2, '0')}`
    let ok = true, err = ''
    try { await fn(); await page.waitForTimeout(600) } catch (e) { ok = false; err = String(e.message || e).replace(/\u001b\[[0-9;]*m/g, '').split('\n')[0].slice(0, 240) }
    const shot = `prints/${perfil}/${id}-${slug(objetivo)}.png`
    await page.screenshot({ path: `${DIR}/${shot}`, mask: [page.getByText(/[\w.+-]+@[\w-]+\.[\w.]+/), page.getByTestId('pc-temp'), page.locator('input[type=password]'), page.locator('input[type=email]'), page.getByTestId('my-code'), page.getByTestId('inv-created')], maskColor: '#9aa0a6' }).catch(() => {})
    const a = JSON.parse(fs.readFileSync(RES, 'utf8')); a.push({ id, objetivo, ok, err, shot, url: page.url().replace(BASE, ''), ...extra }); fs.writeFileSync(RES, JSON.stringify(a, null, 1))
    return ok
  }
}
export async function login(browser, email, password = PASS, o = {}) {
  const ctx = await browser.newContext({ baseURL: BASE, viewport: o.vp || MOBILE, colorScheme: 'light', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })
  const r = await ctx.request.post('/api/auth/login', { data: { email, password } }), u = (await r.json()).user
  await ctx.request.post('/api/me/theme', { data: { theme: 'light' } }).catch(() => {})
  await ctx.addInitScript(([x, t]) => { localStorage.setItem('gym_user', JSON.stringify(x)); if (t) localStorage.setItem('tours_e2e', '1') }, [u, !!o.tours])
  return { ctx, page: await ctx.newPage(), u }
}
export const go = async (page, url, testid) => { if (page.url().endsWith(url.replace(/^\/?/, '/'))) await page.reload(); else await page.goto(url); if (testid) await expect(page.getByTestId(testid).first()).toBeVisible({ timeout: 9000 }); else await page.waitForTimeout(1200) }
export async function registerApi(rq, name, email, extra = {}) {
  const terms = (await (await rq.get('/api/terms')).json()).terms
  const r = await rq.post('/api/auth/register', { data: { name, email, password: PASS, accept_terms: true, terms_version: terms?.version, ...extra } })
  return (await r.json()).user
}
export const dismissTour = async page => { const s = page.getByTestId('tour-skip'); if (await s.isVisible({ timeout: 1500 }).catch(() => false)) await s.click() }
export async function doWorkout(page, step, prefixo = '') {
  await step(page, prefixo + 'Abrir o treino de hoje e ver a preparação dos pesos', () => go(page, '/#/treinar', 'workout-weights'))
  await step(page, prefixo + 'Informar as cargas e iniciar o treino', async () => { for (const i of await page.locator('input[type=number]').all()) await i.fill('12'); await page.getByTestId('confirm-workout-weights').click(); await expect(page.getByTestId('train')).toBeVisible() })
  await step(page, prefixo + 'Iniciar a série (cronômetro rodando)', async () => { await page.getByTestId('start-set').click(); await page.waitForTimeout(1500); await expect(page.getByTestId('finish-set')).toBeVisible() })
  await step(page, prefixo + 'Concluir a série e entrar no descanso', async () => { await page.getByTestId('finish-set').click(); await expect(page.getByTestId('skip-rest')).toBeVisible() })
  await step(page, prefixo + 'Pular o descanso', () => page.getByTestId('skip-rest').click())
  await step(page, prefixo + 'Botão "Relatar dor" visível durante o treino', () => expect(page.getByTestId('report')).toContainText('Relatar dor'))
  await step(page, prefixo + 'Avançar todos os exercícios até a conclusão', async () => {
    for (let i = 0; i < 40 && !(await page.getByTestId('done').isVisible()); i++) {
      const nx = page.getByTestId('next-ex'), st = page.getByTestId('start-set'), fin = page.getByTestId('finish-set'), sk = page.getByTestId('skip-rest')
      if (await nx.isVisible()) await nx.click(); else if (await sk.isVisible()) await sk.click(); else if (await fin.isVisible()) await fin.click(); else if (await st.isVisible()) await st.click(); else break
      await page.waitForTimeout(300) }
    await expect(page.getByTestId('done')).toBeVisible() })
  await step(page, prefixo + 'Tela de conclusão: resumo, como se sentiu, dor', async () => { await expect(page.getByTestId('done-step-resumo')).toBeVisible(); await expect(page.getByTestId('done-step-feel')).toBeVisible(); await page.getByTestId('pain-no').click() })
  await step(page, prefixo + 'Salvar o treino no servidor', async () => { await page.getByTestId('save-session').click(); await expect(page.getByTestId('see-progress')).toBeVisible() })
}
