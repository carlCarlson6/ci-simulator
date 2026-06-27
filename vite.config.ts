import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import os from 'os'
import http from 'http'
import https from 'https'
import { URL } from 'url'

function parseJsonBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (e) {
        reject(e)
      }
    })
    req.on('error', reject)
  })
}

export default defineConfig({
  plugins: [
    tailwindcss(),
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

        server.middlewares.use('/api/proxy-http', async (req, res, next) => {
          if (req.method !== 'POST') {
            res.statusCode = 405
            res.end('Method not allowed')
            return
          }

          try {
            const body = await parseJsonBody(req)
            const targetUrl = body.url
            if (!targetUrl) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing url parameter' }))
              return
            }

            const parsed = new URL(targetUrl)
            const options: http.RequestOptions = {
              hostname: parsed.hostname,
              port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
              path: parsed.pathname + parsed.search,
              method: body.method || 'GET',
              headers: body.headers || {},
              timeout: 10000,
            }

            const client = parsed.protocol === 'https:' ? https : http

            const proxyReq = client.request(options, (proxyRes) => {
              let responseBody = ''
              proxyRes.on('data', (chunk) => { responseBody += chunk })
              proxyRes.on('end', () => {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({
                  status: proxyRes.statusCode,
                  statusText: proxyRes.statusMessage,
                  headers: proxyRes.headers,
                  body: responseBody,
                }))
              })
            })

            proxyReq.on('error', (err) => {
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: err.message }))
            })

            proxyReq.on('timeout', () => {
              proxyReq.destroy()
              res.statusCode = 504
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Request timeout' }))
            })

            if (body.body) {
              proxyReq.write(body.body)
            }
            proxyReq.end()
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: (err as Error).message }))
          }
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
