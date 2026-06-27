import { createServerFn } from '@tanstack/react-start'
import http from 'http'
import https from 'https'
import { URL } from 'url'
import { z } from 'zod'
import { CommandHandler, CommandEffect } from './types'

async function executeHttpRequest(
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
    const req = client.request(options, (res: http.IncomingMessage) => {
      let responseBody = ''
      res.on('data', (chunk: Buffer) => { responseBody += chunk })
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          statusText: res.statusMessage || '',
          headers: res.headers,
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
