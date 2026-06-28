import type { CommandHandler } from './types'

export const MANUAL = `fbfill — Fill framebuffer with a color

Usage:
  fbfill [color]     Fill canvas (default: #00ff00)`

export const HELP_TEXT = 'Fill framebuffer with color'

export const handler: CommandHandler = (args, _context) => {
  return { success: true, data: { output: 'fbfill: framebuffer mode not active.' } }
}
