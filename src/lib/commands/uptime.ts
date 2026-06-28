import type { CommandHandler } from './types'

export const MANUAL = `uptime — Show how long the system has been running

Usage:
  uptime    Display uptime`

export const HELP_TEXT = 'Show system uptime'

export const handler: CommandHandler = (_args, _context) => {
  const startTime = (window as any).__START_TIME || Date.now()
  const uptime = Math.floor((Date.now() - startTime) / 1000)
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  return { success: true, data: { output: `up ${hours}:${String(minutes).padStart(2, '0')}` } }
}
