import type { CommandHandler } from './types'

export const MANUAL = `host — DNS lookup utility

Usage:
  host <hostname>     Perform DNS lookup`

export const HELP_TEXT = 'DNS lookup utility'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'host: missing hostname' }
  }
  return { success: true, data: { output:
    `${args[0]} has address 142.250.80.14\n` +
    `${args[0]} has IPv6 address 2607:f8b0:4000:800::200e`
  } }
}
