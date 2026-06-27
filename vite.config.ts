import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import os from 'os'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server',
      configureServer(server) {
        server.middlewares.use('/api/system-info', (req, res, next) => {
          if (req.method !== 'GET') {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            hostname: os.hostname(),
            username: os.userInfo().username,
            date: new Date().toISOString(),
            platform: os.platform(),
            release: os.release(),
          }))
        })
      },
    },
  ],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
  },
})
