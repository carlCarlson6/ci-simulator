import type { CommandHandler } from './types'

export const MANUAL = `ss — Socket statistics

Usage:
  ss         Show socket statistics
  ss -tlnp   Show listening TCP sockets`

export const HELP_TEXT = 'Socket statistics'

export const handler: CommandHandler = (args, _context) => {
  if (args.includes('-tlnp') || args.includes('-tuln')) {
    return { success: true, data: { output:
      'Netid  State   Recv-Q  Send-Q  Local Address:Port   Peer Address:Port  Process\n' +
      'tcp    LISTEN  0       128     0.0.0.0:80           0.0.0.0:*          \n' +
      'tcp    LISTEN  0       128     0.0.0.0:8080         0.0.0.0:*          \n' +
      'tcp    LISTEN  0       128     127.0.0.1:3000       0.0.0.0:*         '
    } }
  }
  return { success: true, data: { output:
    'Total: 3 (kernel 0)\n' +
    'TCP:   1 (estab 0, closed 0, orphaned 0, synrecv 0, timewait 0/0), ports 3\n' +
    'UDP:   0'
  } }
}
