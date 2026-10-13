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

export default defineConfig({
  plugins: [react(), devMedia()],
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
