import { CommandHandler } from './types'

export const MANUAL = 'mv\n\nMove or rename files or directories.\n\nUsage: mv <source> <destination>'
export const HELP_TEXT = '  mv <src> <dest>       Move or rename file or directory'

export const handler: CommandHandler = (args, context) => {
  if (args.length < 2) {
    return { success: false, error: 'mv: missing file operand' }
  }

  const src = args[0]
  const dest = args[1]

  try {
    const srcResolved = context.fileSystem.resolvePath(src, context.currentPath)
    const destResolved = context.fileSystem.resolvePath(dest, context.currentPath)
    context.fileSystem.moveEntry(srcResolved, destResolved)
    return { success: true, data: { output: '' } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
