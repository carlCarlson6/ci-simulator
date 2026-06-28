import type { CommandHandler, CommandEffect } from './types'

export const MANUAL = `exit — Exit the shell

Usage:
  exit [code]    Exit with optional exit code (default: 0)`

export const HELP_TEXT = 'Exit the shell'

export const handler: CommandHandler = (args, context) => {
  const code = args.length > 0 ? parseInt(args[0], 10) : 0
  return { success: true, data: { output: `exit (code: ${isNaN(code) ? 0 : code})` } }
}

export const effect: CommandEffect = (_result, context) => {
  context.addLine('output', 'Shell exited.')
  return 'handled'
}
