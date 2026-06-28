import type { CommandHandler } from './types'

export const MANUAL = `write — Send a message to another user

Usage:
  write <user> <message>     Send message`

export const HELP_TEXT = 'Send a message to another user'

export const handler: CommandHandler = (args, _context) => {
  if (args.length < 2) {
    return { success: false, error: 'write: missing operand' }
  }
  return { success: true, data: { output: `Message sent to ${args[0]}.` } }
}
