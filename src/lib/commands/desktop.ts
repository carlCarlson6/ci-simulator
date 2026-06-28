import type { CommandHandler, CommandEffect } from './types'

export const MANUAL = `desktop — Switch to desktop environment

Usage:
  desktop

Switches from the full-screen terminal to the CI-OS desktop environment
at /desktop. The desktop provides a graphical window manager, file browser,
and access to all terminal functionality in a windowed interface.

Shortcut: Run 'desktop' from the terminal, or navigate to /desktop directly.`

export const HELP_TEXT = 'Switch to desktop environment'

export const handler: CommandHandler = (_args, _context) => {
  return {
    success: true,
    data: { output: 'Launching desktop environment...' },
  }
}

export const effect: CommandEffect = (_result, _context) => {
  if (typeof window !== 'undefined') {
    window.location.href = '/desktop'
  }
  return 'handled'
}
