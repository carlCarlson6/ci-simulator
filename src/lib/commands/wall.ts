import type { CommandHandler } from './types'

export const MANUAL = `wall — Send a message to all users

Usage:
  wall <message>     Broadcast message to all users`

export const HELP_TEXT = 'Send a message to all users'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'wall: missing message' }
  }
  return { success: true, data: { output: `Broadcast message from all users:\n${args.join(' ')}` } }
}
