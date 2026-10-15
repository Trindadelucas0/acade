// V4 · F1 — E2E local (Playwright). Requer API local em :8787 (Postgres local) — NUNCA aponta para produção.
// Uso: npx playwright test   (sobe o vite em :4449 com proxy /api → :8787)
import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: process.env.PW_JSON || 'e2e-results/results.json' }]],
  outputDir: 'e2e-results/artifacts',
  use: { baseURL: 'http://localhost:4449', trace: 'off', screenshot: 'only-on-failure', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' },
  webServer: { command: 'npx vite --port 4449 --strictPort', url: 'http://localhost:4449', reuseExistingServer: true, timeout: 60000 }
})
