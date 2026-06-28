import type { CommandHandler } from './types'

export const MANUAL = `at — Schedule a one-time task

Usage:
  at <time>     Schedule a command at a specified time`

export const HELP_TEXT = 'Schedule a one-time task'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'at: missing time' }
  }
  return { success: true, data: { output: `warning: commands will be executed using /bin/sh\njob 1 at ${args.join(' ')} (simulated)` } }
}
