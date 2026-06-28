import type { CommandHandler } from './types'

export const MANUAL = `uname — Print system information

Usage:
  uname     Print kernel name
  uname -a  Print all system information`

export const HELP_TEXT = 'Print system information'

export const handler: CommandHandler = (args, _context) => {
  if (args.includes('-a')) {
    return { success: true, data: { output: 'CI-OS ci-simulator 6.8.0-cios #1 SMP Sun Jun 28 10:00:00 UTC 2026 x86_64 GNU/Linux' } }
  }
  return { success: true, data: { output: 'CI-OS' } }
}
