import type { CommandHandler } from './types'

export const MANUAL = `ip — Show/manipulate routing, devices, policy routing

Usage:
  ip addr     Show IP addresses
  ip link     Show network interfaces
  ip route    Show routing table`

export const HELP_TEXT = 'Show/manipulate routing, devices'

export const handler: CommandHandler = (args, _context) => {
  if (args[0] === 'addr') {
    return { success: true, data: { output:
      '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN\n' +
      '    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n' +
      '    inet 127.0.0.1/8 scope host lo\n' +
      '2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP\n' +
      '    link/ether 00:1a:2b:3c:4d:5e brd ff:ff:ff:ff:ff:ff\n' +
      '    inet 10.0.0.2/24 brd 10.0.0.255 scope global eth0'
    } }
  }
  if (args[0] === 'link') {
    return { success: true, data: { output:
      '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT\n' +
      '    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n' +
      '2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP mode DEFAULT\n' +
      '    link/ether 00:1a:2b:3c:4d:5e brd ff:ff:ff:ff:ff:ff'
    } }
  }
  if (args[0] === 'route') {
    return { success: true, data: { output:
      'default via 10.0.0.1 dev eth0\n' +
      '10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.2\n' +
      '127.0.0.0/8 via 127.0.0.1 dev lo'
    } }
  }
  return { success: false, error: `ip: unknown subcommand '${args[0]}'` }
}
