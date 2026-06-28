import type { CommandHandler } from './types'

export const MANUAL = `fbdraw — Draw shapes on the framebuffer

Usage:
  fbdraw rect <x> <y> <w> <h> [color]
  fbdraw line <x1> <y1> <x2> <y2> [color]
  fbdraw circle <cx> <cy> <r> [color]
  fbdraw pixel <x> <y> [color]`

export const HELP_TEXT = 'Draw shapes on framebuffer'

export const handler: CommandHandler = (args, _context) => {
  return { success: true, data: { output: 'fbdraw: framebuffer mode not active. Use a framebuffer-capable terminal.' } }
}
