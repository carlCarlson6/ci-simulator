import type { CommandHandler } from './types'

export const MANUAL = `read — Read a line from stdin into a variable

Usage:
  read <variable>    Read line into variable`

export const HELP_TEXT = 'Read a line from stdin into a variable'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'read: missing variable name' }
  }

  return { success: true, data: { output: '', exportVars: { [args[0]]: '' } } }
}
