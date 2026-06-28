import type { CommandHandler } from './types'

export const MANUAL = `return — Return from a function

Usage:
  return [code]    Return with optional exit code`

export const HELP_TEXT = 'Return from a function'

export const handler: CommandHandler = (args, context) => {
  const code = args.length > 0 ? parseInt(args[0], 10) : 0
  return { success: true, data: { output: '' } }
}
