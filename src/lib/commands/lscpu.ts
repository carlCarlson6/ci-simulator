import type { CommandHandler } from './types'

export const MANUAL = `lscpu — Display CPU information

Usage:
  lscpu    Show CPU architecture information`

export const HELP_TEXT = 'Display CPU information'

export const handler: CommandHandler = (_args, _context) => {
  return { success: true, data: { output:
    'Architecture:            x86_64\n' +
    'CPU op-mode(s):         32-bit, 64-bit\n' +
    'Address sizes:          48 bits physical, 48 bits virtual\n' +
    'Byte Order:             Little Endian\n' +
    'CPU(s):                 4\n' +
    'On-line CPU(s) list:    0-3\n' +
    'Vendor ID:              CI-OS\n' +
    'Model name:             CI-OS Virtual CPU @ 2.4GHz\n' +
    'CPU family:             1\n' +
    'Model:                  Virtual\n' +
    'Thread(s) per core:     1\n' +
    'Core(s) per socket:     4\n' +
    'Socket(s):              1\n' +
    'CPU max MHz:            2400.0000\n' +
    'CPU min MHz:            800.0000\n' +
    'Virtualization:         CI-OS-VM'
  } }
}
