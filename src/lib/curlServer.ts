import http from 'http'
import https from 'https'
import { URL } from 'url'
import { promises as dns } from 'node:dns'

function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

const BLOCKED_RANGES: [number, number][] = [
  [0x00000000, 0x00FFFFFF],   // 0.0.0.0/8
  [0x0A000000, 0x0AFFFFFF],   // 10.0.0.0/8
  [0x7F000000, 0x7FFFFFFF],   // 127.0.0.0/8
  [0xA9FE0000, 0xA9FEFFFF],   // 169.254.0.0/16
  [0xAC100000, 0xAC1FFFFF],   // 172.16.0.0/12
  [0xC0A80000, 0xC0A8FFFF],   // 192.168.0.0/16
  [0xC6120000, 0xC613FFFF],   // 198.18.0.0/15
  [0x64400000, 0x647FFFFF],   // 100.64.0.0/10
]

function isPrivateIP(ip: string): boolean {
  if (ip.includes(':')) {
    if (ip === '::1') return true
    if (ip.startsWith('fe80:')) return true
    if (ip.startsWith('::ffff:')) {
      return isPrivateIP(ip.split(':').pop()!)
    }
    return false
  }

  const int = ipToInt(ip)
  if (int === null) return false
  return BLOCKED_RANGES.some(([start, end]) => int >= start && int <= end)
}

async function resolveAndValidateUrl(url: string): Promise<void> {
  const parsed = new URL(url)
  const { address } = await dns.lookup(parsed.hostname, { family: 0 })
  if (isPrivateIP(address)) {
    throw new Error('curl: connection to internal/private IP not allowed')
  }
}

function sanitizeHeaders(headers: http.IncomingHttpHeaders): http.IncomingHttpHeaders {
  const sanitized = { ...headers }
  delete sanitized['set-cookie']
  delete sanitized['set-cookie2']
  return sanitized
}

export async function executeHttpRequest(
  targetUrl: string,
  method: string = 'GET',
  headers: Record<string, string> = {},
  body?: string
): Promise<{ status: number; statusText: string; headers: http.IncomingHttpHeaders; body: string }> {
  await resolveAndValidateUrl(targetUrl)

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
    const req = client.request(options, (res: http.IncomingMessage) => {
      let responseBody = ''
      res.on('data', (chunk: Buffer) => { responseBody += chunk })
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          statusText: res.statusMessage || '',
          headers: sanitizeHeaders(res.headers),
          body: responseBody,
        })
      })
    })

    req.on('error', (err: Error) => reject(new Error(err.message)))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    if (body) req.write(body)
    req.end()
  })
}
