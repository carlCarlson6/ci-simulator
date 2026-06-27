import { CommandHandler } from './types'

export const MANUAL = 'touch\n\nCreate an empty file or update its timestamp.\n\nUsage: touch <file>'
export const HELP_TEXT = '  touch <file>          Create empty file'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'touch: missing file operand' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    if (!context.fileSystem.exists(resolved)) {
      context.fileSystem.createFile(resolved)
    }
    return { success: true, data: { output: '' } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
