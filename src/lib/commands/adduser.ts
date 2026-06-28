import type { CommandHandler } from './types'

export const MANUAL = `adduser — Create a new user

Usage:
  adduser <username>     Create a new user account`

export const HELP_TEXT = 'Create a new user'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'adduser: missing username' }
  }
  return { success: true, data: { output: `adduser: user '${args[0]}' created (simulated)` } }
}
