import type { CommandHandler } from './types'

export const MANUAL = `groupdel — Delete a group

Usage:
  groupdel <groupname>     Delete a group`

export const HELP_TEXT = 'Delete a group'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'groupdel: missing group name' }
  }
  return { success: true, data: { output: `groupdel: group '${args[0]}' deleted (simulated)` } }
}
