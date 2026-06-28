import type { CommandHandler } from './types'

export const MANUAL = `passwd — Change user password

Usage:
  passwd               Change current user's password
  passwd <username>    Change another user's password (root only)`

export const HELP_TEXT = 'Change user password'

export const handler: CommandHandler = (args, _context) => {
  const target = args[0] || 'current user'
  return { success: true, data: { output: `passwd: password for ${target} updated (simulated)` } }
}
