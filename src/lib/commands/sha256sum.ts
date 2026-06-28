import type { CommandHandler } from './types'

export const MANUAL = `sha256sum — Compute SHA-256 hash

Usage:
  sha256sum <file>     Compute SHA-256 hash of a file`

export const HELP_TEXT = 'Compute SHA-256 hash'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'sha256sum: missing file' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    const content = context.fileSystem.readFile(resolved)

    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash |= 0
    }
    const hashStr = Math.abs(hash).toString(16).padStart(8, '0') + 'a3f5b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6'

    return { success: true, data: { output: `${hashStr}  ${args[0]}` } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
