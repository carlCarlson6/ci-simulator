import type { CommandHandler } from './types'

export const MANUAL = `traceroute — Trace the route to a host

Usage:
  traceroute <host>     Trace route to host (simulated)`

export const HELP_TEXT = 'Trace route to host'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'traceroute: missing host' }
  }
  return { success: true, data: { output:
    `traceroute to ${args[0]} (142.250.80.14), 30 hops max, 60 byte packets\n` +
    ' 1  10.0.0.1    1.234 ms  1.456 ms  1.567 ms\n' +
    ' 2  172.16.0.1  8.901 ms  9.012 ms  9.123 ms\n' +
    ' 3  203.0.113.1  14.567 ms  14.678 ms  14.789 ms\n' +
    ' 4  142.250.80.14  15.012 ms  15.123 ms  15.234 ms'
  } }
}
