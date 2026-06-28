import type { CommandHandler } from './types'

export const MANUAL = `nc — Netcat (network connection tool)

Usage:
  nc -l <port>              Listen on a port
  nc <host> <port>          Connect to a host:port`

export const HELP_TEXT = 'Netcat - network connection tool'

export const handler: CommandHandler = (args, _context) => {
  if (args[0] === '-l') {
    if (!args[1]) return { success: false, error: 'nc: missing port' }
    return { success: true, data: { output: `Listening on port ${args[1]}... (simulated)` } }
  }

  if (args.length >= 2) {
    return { success: true, data: { output: `Connected to ${args[0]}:${args[1]} (simulated)\nEscape character is '^]'.` } }
  }

  return { success: false, error: 'nc: missing operand' }
}
