import type { CommandHandler } from './types'

export const MANUAL = `mount — Display mounted filesystems

Usage:
  mount     Show mounted filesystems`

export const HELP_TEXT = 'Display mounted filesystems'

export const handler: CommandHandler = (_args, _context) => {
  const output = [
    'proc on /proc type proc (rw,noexec,nosuid,nodev)',
    'dev on /dev type dev (rw,noexec)',
    'sys on /sys type sysfs (rw,noexec)',
    '/dev/vda1 on / type ext4 (rw,relatime)',
  ].join('\n')

  return { success: true, data: { output } }
}
