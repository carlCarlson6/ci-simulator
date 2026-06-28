import type { CommandHandler } from './types'

export const MANUAL = `chmod — Change file mode bits

Usage:
  chmod <mode> <file>     Change mode (e.g., 755, 644, +x)
  chmod +x <file>         Add execute permission
  chmod -x <file>         Remove execute permission`

export const HELP_TEXT = 'Change file mode bits'

export const handler: CommandHandler = (args, context) => {
  if (args.length < 2) {
    return { success: false, error: 'chmod: missing operand' }
  }

  const modeStr = args[0]
  const file = args[1]

  try {
    const resolved = context.fileSystem.resolvePath(file, context.currentPath)
    const entry = context.fileSystem.getEntry(resolved)
    if (!entry) return { success: false, error: `chmod: cannot access '${file}': No such file or directory` }

    if (modeStr === '+x') {
      context.fileSystem.chmod(resolved, (entry.mode ?? 0o644) | 0o111)
    } else if (modeStr === '-x') {
      context.fileSystem.chmod(resolved, (entry.mode ?? 0o644) & ~0o111)
    } else {
      const mode = parseInt(modeStr, 8)
      if (isNaN(mode)) return { success: false, error: `chmod: invalid mode: '${modeStr}'` }
      context.fileSystem.chmod(resolved, mode)
    }

    return { success: true, data: { output: '' } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
