import type { CommandHandler } from './types'

export const MANUAL = 'cat\n\nDisplay file contents.\n\nUsage: cat <file>'
export const HELP_TEXT = 'Display file contents'

export const handler: CommandHandler = (args, context) => {
  const pipedInput = context.pipedInput

  if (args.length === 0) {
    if (pipedInput && pipedInput.length > 0) {
      return { success: true, data: { output: pipedInput.join('\n') } }
    }
    return { success: false, error: 'cat: missing file operand' }
  }

  try {
    if (args[0] === '-') {
      if (pipedInput && pipedInput.length > 0) {
        return { success: true, data: { output: pipedInput.join('\n') } }
      }
      return { success: true, data: { output: '' } }
    }

    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    const content = context.fileSystem.readFile(resolved)
    return { success: true, data: { output: content } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
