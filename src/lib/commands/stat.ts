import type { CommandHandler } from './types'

export const MANUAL = `stat — Display file or file system status

Usage:
  stat <file>     Display detailed file metadata`

export const HELP_TEXT = 'Display file metadata'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'stat: missing operand' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    const entry = context.fileSystem.stat(resolved)

    const typeMap: Record<string, string> = { file: 'Regular File', directory: 'Directory', link: 'Symbolic Link', device: 'Device', proc: 'Proc' }
    const typeStr = typeMap[entry.type] || entry.type
    const modeStr = ((entry.mode ?? 0o644).toString(8)).padStart(3, '0')

    const lines = [
      `  File: ${args[0]}`,
      `  Type: ${typeStr}`,
      `  Mode: 0${modeStr}`,
      `  UID: ${entry.uid ?? 1000}`,
      `  GID: ${entry.gid ?? 1000}`,
      `  Size: ${(entry.content || '').length} bytes`,
      entry.linkTarget ? `  Link: -> ${entry.linkTarget}` : undefined,
    ].filter(Boolean).join('\n')

    return { success: true, data: { output: lines } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
