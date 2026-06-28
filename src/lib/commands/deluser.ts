import type { CommandHandler } from './types'

export const MANUAL = `deluser — Delete a user account

Usage:
  deluser <username>     Delete a user account`

export const HELP_TEXT = 'Delete a user account'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'deluser: missing username' }
  }
  return { success: true, data: { output: `deluser: user '${args[0]}' deleted (simulated)` } }
}
