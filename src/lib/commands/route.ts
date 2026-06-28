import type { CommandHandler } from './types'

export const MANUAL = `route — Show routing table

Usage:
  route      Display routing table
  route -n   Display numeric routing table`

export const HELP_TEXT = 'Show routing table'

export const handler: CommandHandler = (args, _context) => {
  const numeric = args.includes('-n')
  return { success: true, data: { output:
    'Kernel IP routing table\n' +
    'Destination     Gateway         Genmask         Flags Metric Ref    Use Iface\n' +
    '0.0.0.0         10.0.0.1        0.0.0.0         UG    100    0        0 eth0\n' +
    '10.0.0.0        0.0.0.0         255.255.255.0   U     100    0        0 eth0\n' +
    '127.0.0.0       0.0.0.0         255.0.0.0       U     100    0        0 lo'
  } }
}
