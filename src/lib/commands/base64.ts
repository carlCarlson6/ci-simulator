import type { CommandHandler } from './types'

export const MANUAL = `base64 — Encode/decode base64

Usage:
  base64 <file>          Encode file
  base64 -d <file>       Decode file`

export const HELP_TEXT = 'Encode/decode base64'

export const handler: CommandHandler = (args, context) => {
  const decode = args.includes('-d')
  const fileArg = args.find((a) => !a.startsWith('-'))

  if (!fileArg) {
    return { success: false, error: 'base64: missing file' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(fileArg, context.currentPath)
    const content = context.fileSystem.readFile(resolved)

    if (decode) {
      return { success: true, data: { output: atob(content) } }
    }
    return { success: true, data: { output: btoa(content) } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
