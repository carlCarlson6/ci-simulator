import type { CommandHandler, CommandEffect } from './types'

export const MANUAL = `reboot — Reboot the system

Usage:
  reboot    Restart the system`

export const HELP_TEXT = 'Reboot the system'

export const handler: CommandHandler = (_args, _context) => {
  return { success: true, data: { output: 'System rebooting...' } }
}

export const effect: CommandEffect = (result, context) => {
  if (result.success) {
    context.addLine('system', result.data?.output || '')
  }
  return 'handled'
}
