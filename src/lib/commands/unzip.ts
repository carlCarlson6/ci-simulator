import type { CommandHandler } from './types'

export const MANUAL = `unzip — Extract compressed files

Usage:
  unzip <archive.zip>     Extract zip archive`

export const HELP_TEXT = 'Extract compressed files'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'unzip: missing archive' }
  }
  return { success: true, data: { output: `Archive:  ${args[0]}\n  inflating: file1.txt\n  inflating: file2.txt\n  creating: dir/` } }
}
