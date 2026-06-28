import type { CommandHandler } from './types'

export const MANUAL = `fbclear — Clear the framebuffer

Usage:
  fbclear     Clear canvas to black`

export const HELP_TEXT = 'Clear the framebuffer'

export const handler: CommandHandler = (_args, _context) => {
  return { success: true, data: { output: 'fbclear: framebuffer mode not active.' } }
}
