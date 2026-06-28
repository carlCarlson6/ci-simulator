import type { CommandHandler } from './types'

export const MANUAL = `groupadd — Create a new group

Usage:
  groupadd <groupname>     Create a new group`

export const HELP_TEXT = 'Create a new group'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'groupadd: missing group name' }
  }
  return { success: true, data: { output: `groupadd: group '${args[0]}' created (simulated)` } }
}
