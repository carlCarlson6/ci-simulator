import type { CommandHandler } from './types'

export const MANUAL = `chown — Change file owner and group

Usage:
  chown <user>:<group> <file>     Change owner and group
  chown <user> <file>             Change owner only`

export const HELP_TEXT = 'Change file owner and group'

export const handler: CommandHandler = (args, context) => {
  if (args.length < 2) {
    return { success: false, error: 'chown: missing operand' }
  }

  const ownerStr = args[0]
  const file = args[1]

  try {
    const resolved = context.fileSystem.resolvePath(file, context.currentPath)
    const entry = context.fileSystem.getEntry(resolved)
    if (!entry) return { success: false, error: `chown: cannot access '${file}': No such file or directory` }

    let uid = 1000
    let gid = 1000

    if (ownerStr.includes(':')) {
      const parts = ownerStr.split(':')
      uid = parseInt(parts[0], 10) || 1000
      gid = parseInt(parts[1], 10) || 1000
    } else {
      uid = parseInt(ownerStr, 10) || 1000
      gid = entry.gid ?? 1000
    }

    context.fileSystem.chown(resolved, uid, gid)
    return { success: true, data: { output: '' } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
