import type { CommandHandler } from './types'

export const MANUAL = `df — Report file system disk space usage

Usage:
  df       Show disk usage
  df -h    Human-readable format`

export const HELP_TEXT = 'Report filesystem disk space usage'

export const handler: CommandHandler = (args, _context) => {
  const human = args.includes('-h')
  if (human) {
    return { success: true, data: { output:
      'Filesystem      Size  Used Avail Use% Mounted on\n' +
      '/dev/vda1       20G   8.5G   12G  43% /\n' +
      'tmpfs           4.0G     0  4.0G   0% /tmp'
    } }
  }
  return { success: true, data: { output:
    'Filesystem     1K-blocks     Used Available Use% Mounted on\n' +
    '/dev/vda1       20971520  8912896  12058624  43% /\n' +
    'tmpfs           4194304        0   4194304   0% /tmp'
  } }
}
