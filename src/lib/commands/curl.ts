import { CommandHandler } from './types'

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
