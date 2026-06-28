import type { CommandHandler } from './types'

export const MANUAL = `free — Display amount of free and used memory

Usage:
  free      Show memory in kB
  free -h   Show memory in human-readable format`

export const HELP_TEXT = 'Display memory usage'

export const handler: CommandHandler = (args, _context) => {
  const human = args.includes('-h')
  const total = 8388608
  const used = 4194304
  const free = 4194304
  const shared = 262144
  const buffCache = 1048576
  const avail = 6291456

  if (human) {
    return { success: true, data: { output:
      '              total        used        free      shared  buff/cache   available\n' +
      'Mem:           8.0G        4.0G        4.0G        256M        1.0G        6.0G\n' +
      'Swap:          2.0G        0.0B        2.0G'
    } }
  }

  const output =
    '              total        used        free      shared  buff/cache   available\n' +
    `Mem:    ${String(total).padStart(11)} ${String(used).padStart(11)} ${String(free).padStart(11)} ${String(shared).padStart(11)} ${String(buffCache).padStart(11)} ${String(avail).padStart(11)}\n` +
    'Swap:   2097152          0    2097152'

  return { success: true, data: { output } }
}
