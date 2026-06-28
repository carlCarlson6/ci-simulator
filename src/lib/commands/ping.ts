import type { CommandHandler } from './types'

export const MANUAL = `ping — Send ICMP echo requests

Usage:
  ping <host>     Ping a host (simulated ICMP)`

export const HELP_TEXT = 'Send ICMP echo requests'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'ping: missing host' }
  }

  const host = args[0]
  const latency = host === 'localhost' ? 0.1 : host.includes('.') ? 14 + Math.random() * 3 : 42 + Math.random() * 10

  return {
    success: true,
    data: {
      output: `PING ${host} (${host === 'localhost' ? '127.0.0.1' : '142.250.80.14'}): 56 data bytes\n64 bytes from ${host === 'localhost' ? '127.0.0.1' : '142.250.80.14'}: icmp_seq=0 ttl=118 time=${latency.toFixed(1)} ms\n\n--- ${host} ping statistics ---\n1 packets transmitted, 1 packets received, 0% packet loss\nround-trip min/avg/max = ${latency.toFixed(1)}/${latency.toFixed(1)}/${latency.toFixed(1)} ms`,
    },
  }
}
