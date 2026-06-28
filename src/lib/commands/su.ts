import type { CommandHandler } from './types'

export const MANUAL = `su — Switch user

Usage:
  su <username>     Switch to another user
  su -              Switch to root with login shell`

export const HELP_TEXT = 'Switch user'

export const handler: CommandHandler = (args, _context) => {
  const target = args[0] || 'root'
  return { success: true, data: { output: `su: switched to user '${target}' (simulated)` } }
}
