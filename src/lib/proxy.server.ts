import http from 'http'
import https from 'https'
import { URL } from 'url'

export async function executeProxyRequest(
  targetUrl: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  body?: string
): Promise<{ status: number; statusText: string; headers: http.IncomingHttpHeaders; body: string }> {
  const parsed = new URL(targetUrl)
  const options: http.RequestOptions = {
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method,
    headers,
    timeout: 10000,
  }

  const client = parsed.protocol === 'https:' ? https : http

  return new Promise((resolve, reject) => {
    const proxyReq = client.request(options, (proxyRes: http.IncomingMessage) => {
      let responseBody = ''
      proxyRes.on('data', (chunk: Buffer) => { responseBody += chunk })
      proxyRes.on('end', () => {
        resolve({
          status: proxyRes.statusCode || 0,
          statusText: proxyRes.statusMessage || '',
          headers: proxyRes.headers,
          body: responseBody,
        })
      })
    })

    proxyReq.on('error', (err: Error) => reject(new Error(err.message)))
    proxyReq.on('timeout', () => {
      proxyReq.destroy()
      reject(new Error('Request timeout'))
    })

    if (body) proxyReq.write(body)
    proxyReq.end()
  })
}
