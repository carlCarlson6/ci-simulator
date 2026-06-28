import type { CommandHandler, CommandEffect } from './types'

export const MANUAL = `halt — Halt the system

Usage:
  halt    Stop the system`

export const HELP_TEXT = 'Halt the system'

export const handler: CommandHandler = (_args, _context) => {
  return { success: true, data: { output: 'System halted.' } }
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
