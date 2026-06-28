import type { CommandHandler } from './types'

export const MANUAL = `wget — Download files from the web

Usage:
  wget <url>     Download URL to filesystem (simulated)`

export const HELP_TEXT = 'Download files from the web'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'wget: missing URL' }
  }

  const url = args[0]
  const filename = url.split('/').pop() || 'index.html'

  try {
    const resolved = context.fileSystem.resolvePath(filename, context.currentPath)
    context.fileSystem.writeFile(resolved, `[wget] Downloaded content from ${url}\n`)
    return { success: true, data: { output: `--${new Date().toISOString()}--  ${url}\nResolving ${url}... 142.250.80.14\nConnecting to ${url}:80... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: unspecified [text/html]\nSaving to: '${resolved}'\n\n${resolved}  100%[=========================================>]  --.--K/s  in 0s\n\nDownloaded to ${resolved}` } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
