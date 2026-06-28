import type { CommandHandler } from './types'

export const MANUAL = `umask — Set file mode creation mask

Usage:
  umask        Show current umask
  umask <mode> Set umask (e.g., 022)`

export const HELP_TEXT = 'Set file mode creation mask'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: true, data: { output: '0022' } }
  }

  return { success: true, data: { output: '' } }
}
