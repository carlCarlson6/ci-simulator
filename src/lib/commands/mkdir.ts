import { CommandHandler } from './types'

export const MANUAL = 'mkdir\n\nCreate a directory.\n\nUsage: mkdir <directory>'
export const HELP_TEXT = '  mkdir <dir>           Create directory'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'mkdir: missing operand' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    context.fileSystem.createDirectory(resolved)
    return { success: true, data: { output: '' } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
