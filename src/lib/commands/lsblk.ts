import type { CommandHandler } from './types'

export const MANUAL = `lsblk — List block devices

Usage:
  lsblk    List all block devices`

export const HELP_TEXT = 'List block devices'

export const handler: CommandHandler = (_args, _context) => {
  return { success: true, data: { output:
    'NAME  MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT\n' +
    'vda    8:0    0   20G  0 disk \n' +
    'vda1   8:1    0   20G  0 part /\n' +
    'sr0   11:0    0  2.5G  0 rom  /mnt/cdrom'
  } }
}
