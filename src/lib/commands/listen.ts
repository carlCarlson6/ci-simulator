import type { CommandHandler } from './types'

export const MANUAL = `listen — Start a TCP listener on a port

Usage:
  listen <port>       Start listening on port
  listen <port> &     Start in background`

export const HELP_TEXT = 'Start a TCP listener'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'listen: missing port' }
  }
  return { success: true, data: { output: `Listening on port ${args[0]}... (simulated)` } }
}
