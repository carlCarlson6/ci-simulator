import type { CommandHandler } from './types'

export const MANUAL = `crontab — Schedule recurring commands

Usage:
  crontab -l     List current crontab
  crontab -e     Edit crontab`

export const HELP_TEXT = 'Schedule recurring commands'

export const handler: CommandHandler = (args, _context) => {
  if (args.includes('-l')) {
    return { success: true, data: { output: '# Crontab (simulated)\n# No scheduled jobs' } }
  }
  if (args.includes('-e')) {
    return { success: true, data: { output: 'crontab: editing crontab (simulated)' } }
  }
  return { success: false, error: 'crontab: missing option' }
}
