import type { CommandHandler } from './types'

export const MANUAL = `tar — Archive files

Usage:
  tar -cf <archive.tar> <files...>     Create archive
  tar -xf <archive.tar>               Extract archive
  tar -tf <archive.tar>               List archive contents`

export const HELP_TEXT = 'Archive files'

export const handler: CommandHandler = (args, _context) => {
  if (args.length < 2) {
    return { success: false, error: 'tar: missing operand' }
  }

  const flags = args[0]
  const archive = args[1]

  if (flags.includes('c')) {
    return { success: true, data: { output: `Created ${archive} (simulated)` } }
  }
  if (flags.includes('x')) {
    return { success: true, data: { output: `Extracted ${archive} (simulated)` } }
  }
  if (flags.includes('t')) {
    return { success: true, data: { output: `Contents of ${archive}:\nfile1.txt\nfile2.txt\ndir/` } }
  }

  return { success: false, error: 'tar: invalid flags' }
}
