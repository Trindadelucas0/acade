import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// Dev only: serve the exercise media (img/, gif/) from OPENGYM_MEDIA_DIR, mirroring what
// nginx does in production (media volume mounted at /img and /gif). Off when unset.
const mediaDir = process.env.OPENGYM_MEDIA_DIR
const devMedia = () => ({
  name: 'dev-media',
  apply: 'serve',
  configureServer(server) {
    if (!mediaDir) return
    server.middlewares.use((req, res, next) => {
      const m = /^\/(img|gif)\/([\w.-]+)$/.exec((req.url || '').split('?')[0])
      if (!m) return next()
      const file = path.join(mediaDir, m[1], m[2])
      if (!fs.existsSync(file)) { res.statusCode = 404; return res.end() }
      res.setHeader('Content-Type', m[1] === 'gif' ? 'image/gif' : 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      fs.createReadStream(file).pipe(res)
    })
  }
})

// V4.1 — id do build: vai para o bundle (__BUILD_ID__), para dist/version.json e para o nome do cache do sw.js
// (bytes do sw.js mudam a cada build → o navegador detecta a versão nova e o PWA instalado se atualiza sozinho).
const BUILD_ID = process.env.BUILD_ID || new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
const buildStamp = () => ({
  name: 'build-stamp', apply: 'build',
  closeBundle() {
    const out = path.resolve('dist')
    fs.writeFileSync(path.join(out, 'version.json'), JSON.stringify({ build: BUILD_ID, at: new Date().toISOString() }) + '\n')
    const sw = path.join(out, 'sw.js')
    if (fs.existsSync(sw)) fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/__BUILD_ID__/g, BUILD_ID))
  }
})

export default defineConfig({
  plugins: [react(), devMedia(), buildStamp()],
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  // V4 · F1: specs do Playwright (e2e/) não rodam no vitest
  test: { exclude: ['e2e-results/**', '.cache/**', 'e2e/**', 'node_modules/**', 'android/**', 'ios/**'] },
  server: {
    port: 4449,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true
      }
    }
  }
})
