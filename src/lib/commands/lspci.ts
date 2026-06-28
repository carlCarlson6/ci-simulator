import type { CommandHandler } from './types'

export const MANUAL = `lspci — List PCI devices

Usage:
  lspci    List all PCI devices`

export const HELP_TEXT = 'List PCI devices'

export const handler: CommandHandler = (_args, _context) => {
  return { success: true, data: { output:
    '00:00.0 Host bridge: CI-OS Virtual Host Bridge\n' +
    '00:01.0 VGA compatible controller: CI-OS Virtual GPU\n' +
    '00:02.0 Ethernet controller: CI-OS Virtual NIC\n' +
    '00:03.0 SATA controller: CI-OS Virtual SATA Controller\n' +
    '00:04.0 USB controller: CI-OS Virtual USB Controller\n' +
    '00:05.0 Audio device: CI-OS Virtual Audio'
  } }
}
