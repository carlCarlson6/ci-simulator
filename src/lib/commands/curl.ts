import { createServerFn } from '@tanstack/react-start'
import http from 'http'
import https from 'https'
import { URL } from 'url'
import { z } from 'zod'
import { promises as dns } from 'node:dns'
import { CommandHandler, CommandEffect } from './types'

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

async function executeHttpRequest(
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

const curlRequestSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
})

const runCurlRequest = createServerFn({ method: 'POST' })
  .validator(curlRequestSchema)
  .handler(async ({ data }) => {
    try {
      const result = await executeHttpRequest(data.url, data.method, data.headers, data.body)
      return {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        body: result.body,
      }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

export const MANUAL = 'curl\n\nTransfer data from or to a server.\n\nUsage: curl [options] <url>\n  -I    Fetch headers only (HEAD request)'
export const HELP_TEXT = '  curl [-I] <url>       Make HTTP request'

export const handler: CommandHandler = (args) => {
  const headOnly = args.includes('-I')
  const url = args.find((arg) => !arg.startsWith('-'))

  if (!url) {
    return { success: false, error: 'curl: missing URL' }
  }

  let targetUrl = url
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl
  }

  return {
    success: true,
    data: {
      output: '',
      curlUrl: targetUrl,
      curlMethod: headOnly ? 'HEAD' : 'GET',
    },
  }
}

export const effect: CommandEffect = (result, context) => {
  if (!result.success || !result.data?.curlUrl) {
    return 'continue'
  }

  runCurlRequest({
    data: {
      url: result.data.curlUrl,
      method: (result.data.curlMethod || 'GET') as 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    },
  })
    .then((data) => {
      if (data.error) {
        context.addLine('error', `curl: ${data.error}`)
        return
      }

      const lines: string[] = []
      lines.push(`HTTP/${data.status} ${data.statusText || 'OK'}`)

      if (data.headers) {
        for (const [key, value] of Object.entries(data.headers)) {
          if (value) lines.push(`${key}: ${value}`)
        }
      }

      lines.push('')

      if (data.body) {
        const bodyLines = String(data.body).split('\n')
        const maxLines = 100
        for (let i = 0; i < Math.min(bodyLines.length, maxLines); i++) {
          lines.push(bodyLines[i])
        }
        if (bodyLines.length > maxLines) {
          lines.push(`... (${bodyLines.length - maxLines} more lines)`)
        }
      }

      for (const line of lines) {
        context.addLine('output', line)
      }
    })
    .catch((err) => {
      context.addLine('error', `curl: ${err.message}`)
    })

  return 'handled'
}
