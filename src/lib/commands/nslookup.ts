import type { CommandHandler } from './types'

export const MANUAL = `nslookup — Query DNS for host information

Usage:
  nslookup <host>     DNS lookup for hostname`

export const HELP_TEXT = 'Query DNS for host information'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'nslookup: missing host' }
  }
  return { success: true, data: { output:
    `Server:         127.0.0.53\n` +
    `Address:        127.0.0.53#53\n\n` +
    `Non-authoritative answer:\n` +
    `Name:   ${args[0]}\n` +
    `Address: 142.250.80.14`
  } }
}
