import type { CommandHandler } from './types'

export const MANUAL = `hostname — Show or set system hostname

Usage:
  hostname             Display hostname
  hostname <new-name>  Set hostname`

export const HELP_TEXT = 'Show or set system hostname'

export const handler: CommandHandler = (args, _context) => {
  if (args.length > 0) {
    try {
      const existing = _context.fileSystem.readFile('/etc/hostname')
      if (existing) {
        _context.fileSystem.writeFile('/etc/hostname', args[0] + '\n')
      }
    } catch {}
    return { success: true, data: { output: '' } }
  }

  try {
    const hostname = _context.fileSystem.readFile('/etc/hostname')
    return { success: true, data: { output: hostname?.trim() || 'ci-simulator' } }
  } catch {
    return { success: true, data: { output: 'ci-simulator' } }
  }
}
