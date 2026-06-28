import type { CommandHandler } from './types'

export const MANUAL = `ifconfig — Configure network interfaces

Usage:
  ifconfig              Show all interfaces
  ifconfig <interface>  Show specific interface`

export const HELP_TEXT = 'Configure network interfaces'

export const handler: CommandHandler = (args, _context) => {
  if (args.length > 0) {
    const iface = args[0]
    return { success: true, data: { output:
      `${iface}: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n` +
      `        inet 10.0.0.2  netmask 255.255.255.0  broadcast 10.0.0.255\n` +
      `        ether 00:1a:2b:3c:4d:5e  txqueuelen 1000  (Ethernet)\n` +
      `        RX packets 1234  bytes 98765 (96.4 KiB)\n` +
      `        TX packets 567  bytes 43210 (42.2 KiB)`
    } }
  }

  return { success: true, data: { output:
    'lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536\n' +
    '        inet 127.0.0.1  netmask 255.0.0.0\n' +
    '        loop  txqueuelen 1000  (Local Loopback)\n\n' +
    'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n' +
    '        inet 10.0.0.2  netmask 255.255.255.0  broadcast 10.0.0.255\n' +
    '        ether 00:1a:2b:3c:4d:5e  txqueuelen 1000  (Ethernet)\n\n' +
    'wlan0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n' +
    '        inet 192.168.1.5  netmask 255.255.255.0  broadcast 192.168.1.255\n' +
    '        ether 00:de:ad:be:ef:00  txqueuelen 1000  (Wireless)'
  } }
}
