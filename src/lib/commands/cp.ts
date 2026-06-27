import { CommandHandler } from './types'

export const MANUAL = 'cp\n\nCopy files or directories.\n\nUsage: cp [-r] <source> <destination>\n  -r    Copy directories recursively'
export const HELP_TEXT = '  cp [-r] <src> <dest>  Copy file or directory'

export const handler: CommandHandler = (args, context) => {
  const recursive = args.includes('-r')
  const targets = args.filter((arg) => !arg.startsWith('-'))

  if (targets.length < 2) {
    return { success: false, error: 'cp: missing file operand' }
  }

  const src = targets[0]
  const dest = targets[1]

  try {
    const srcResolved = context.fileSystem.resolvePath(src, context.currentPath)
    const destResolved = context.fileSystem.resolvePath(dest, context.currentPath)
    context.fileSystem.copyEntry(srcResolved, destResolved, recursive)
    return { success: true, data: { output: '' } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
