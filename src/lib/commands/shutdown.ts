import type { CommandHandler, CommandEffect } from './types'

export const MANUAL = `shutdown — Shut down the system

Usage:
  shutdown -h now     Halt the system
  shutdown -r now     Reboot the system`

export const HELP_TEXT = 'Shut down the system'

export const handler: CommandHandler = (args, _context) => {
  if (args.includes('-h') || args.includes('now')) {
    return { success: true, data: { output: 'System is going down for halt NOW!' } }
  }
  if (args.includes('-r')) {
    return { success: true, data: { output: 'System is going down for reboot NOW!' } }
  }
  return { success: true, data: { output: 'Shutdown scheduled (simulated)' } }
}

export const effect: CommandEffect = (result, context) => {
  if (result.success) {
    context.addLine('system', result.data?.output || '')
    if (typeof window !== 'undefined') {
      setTimeout(() => { window.location.href = '/' }, 1000)
    }
  }
  return 'handled'
}
