import { executeCurl } from '../server-fns'
import { CommandHandler, CommandEffect } from './types'

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

  (executeCurl as any)({ data: { url: result.data.curlUrl, method: result.data.curlMethod || 'GET' } })
    .then((data: any) => {
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
    .catch((err: Error) => {
      context.addLine('error', `curl: ${err.message}`)
    })

  return 'handled'
}
