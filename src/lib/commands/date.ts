import type { CommandHandler } from './types'

export const MANUAL = `date — Display or set date and time

Usage:
  date           Display current date/time
  date +%Y-%m-%d Custom format`

export const HELP_TEXT = 'Display date and time'

export const handler: CommandHandler = (args, _context) => {
  const now = new Date()

  if (args.length > 0 && args[0].startsWith('+')) {
    const fmt = args[0].slice(1)
      .replace(/%Y/g, String(now.getFullYear()))
      .replace(/%m/g, String(now.getMonth() + 1).padStart(2, '0'))
      .replace(/%d/g, String(now.getDate()).padStart(2, '0'))
      .replace(/%H/g, String(now.getHours()).padStart(2, '0'))
      .replace(/%M/g, String(now.getMinutes()).padStart(2, '0'))
      .replace(/%S/g, String(now.getSeconds()).padStart(2, '0'))
    return { success: true, data: { output: fmt } }
  }

  return { success: true, data: { output: now.toString() } }
}
