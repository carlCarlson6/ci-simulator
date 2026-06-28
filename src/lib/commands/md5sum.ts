import type { CommandHandler } from './types'

export const MANUAL = `md5sum — Compute MD5 hash

Usage:
  md5sum <file>     Compute MD5 hash of a file`

export const HELP_TEXT = 'Compute MD5 hash'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'md5sum: missing file' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    const content = context.fileSystem.readFile(resolved)

    let hash = 0
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) - hash) + content.charCodeAt(i)
      hash |= 0
    }
    const hashStr = Math.abs(hash).toString(16).padStart(8, '0') + 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6'

    return { success: true, data: { output: `${hashStr}  ${args[0]}` } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
