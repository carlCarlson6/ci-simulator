import type { CommandHandler } from './types'

export const MANUAL = `dmesg — Print kernel ring buffer

Usage:
  dmesg    Display kernel messages`

export const HELP_TEXT = 'Print kernel ring buffer'

export const handler: CommandHandler = (_args, _context) => {
  return { success: true, data: { output:
    '[    0.000000] CI-OS Kernel v6.8.0-cios booting...\n' +
    '[    0.001000] Virtual CPU: CI-OS Virtual CPU @ 2.4GHz detected\n' +
    '[    0.002000] Memory: 8388608K available\n' +
    '[    0.005000] Mounted /proc filesystem\n' +
    '[    0.006000] Mounted /dev filesystem\n' +
    '[    0.010000] Network: Virtual Ethernet initialized\n' +
    '[    0.015000] Console: CI-OS Virtual Terminal\n' +
    '[    0.020000] Kernel ready.'
  } }
}
