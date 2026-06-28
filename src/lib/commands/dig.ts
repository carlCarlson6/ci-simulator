import type { CommandHandler } from './types'

export const MANUAL = `dig — DNS lookup utility

Usage:
  dig <hostname>     Detailed DNS query`

export const HELP_TEXT = 'DNS lookup utility'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    return { success: false, error: 'dig: missing hostname' }
  }
  return { success: true, data: { output:
    `; <<>> DiG 9.18.0 <<>> ${args[0]}\n` +
    `;; global options: +cmd\n` +
    `;; Got answer:\n` +
    `;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 12345\n` +
    `;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1\n\n` +
    `;; QUESTION SECTION:\n` +
    `;${args[0]}.             IN      A\n\n` +
    `;; ANSWER SECTION:\n` +
    `${args[0]}.      300     IN      A       142.250.80.14\n\n` +
    `;; Query time: 42 msec\n` +
    `;; SERVER: 127.0.0.53#53(127.0.0.53)\n` +
    `;; WHEN: ${new Date().toString()}\n` +
    `;; MSG SIZE  rcvd: 73`
  } }
}
