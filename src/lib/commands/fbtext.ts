import type { CommandHandler } from './types'

export const MANUAL = `fbtext — Draw text on the framebuffer

Usage:
  fbtext <x> <y> "<text>" [color]`

export const HELP_TEXT = 'Draw text on framebuffer'

export const handler: CommandHandler = (args, _context) => {
  return { success: true, data: { output: 'fbtext: framebuffer mode not active.' } }
}
