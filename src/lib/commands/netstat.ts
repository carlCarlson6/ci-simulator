import type { CommandHandler } from './types'

export const MANUAL = `netstat — Network statistics

Usage:
  netstat         Show network connections
  netstat -tlnp   Show listening ports`

export const HELP_TEXT = 'Network statistics'

export const handler: CommandHandler = (args, _context) => {
  if (args.includes('-tlnp') || args.includes('-tuln')) {
    return { success: true, data: { output:
      'Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program\n' +
      'tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      -\n' +
      'tcp        0      0 0.0.0.0:8080            0.0.0.0:*               LISTEN      -\n' +
      'tcp        0      0 127.0.0.1:3000          0.0.0.0:*               LISTEN      -\n' +
      'udp        0      0 0.0.0.0:5353           0.0.0.0:*                           -'
    } }
  }
  return { success: true, data: { output:
    'Active Internet connections (servers and established)\n' +
    'Proto Recv-Q Send-Q Local Address           Foreign Address         State\n' +
    'tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN\n' +
    'tcp        0      0 127.0.0.1:3000          0.0.0.0:*               LISTEN\n' +
    'tcp        0      0 10.0.0.2:45212          93.184.216.34:80        ESTABLISHED'
  } }
}
