import type { CommandHandler } from './types'
import { ProcessManager } from '../processManager'

export const MANUAL = `ps — Report process status

Usage:
  ps          List processes in current session
  ps -a       List all processes
  ps -u       List processes with user format
  ps -ef      Full-format listing
  ps aux      BSD-style full listing`

export const HELP_TEXT = 'Report process status'

export const handler: CommandHandler = (args, context) => {
  const pm = (context as any).processManager as ProcessManager | undefined
  if (!pm) return { success: false, error: 'ps: process manager not available' }

  const all = args.includes('-a') || args.includes('-ef') || args.includes('aux')
  const full = args.includes('-ef') || args.includes('aux')

  const processes = all ? pm.list() : pm.getBySession((context as any).sessionId ?? 0)

  if (processes.length === 0) {
    return { success: true, data: { output: '  PID  COMMAND' } }
  }

  if (full) {
    const header = '  PID  PPID  STATE     COMMAND'
    const rows = processes.map(
      (p) =>
        `${String(p.pid).padStart(5)} ${String(p.ppid).padStart(5)} ${p.state.padEnd(9)} ${p.command} ${p.args.join(' ')}`
    )
    return { success: true, data: { output: [header, ...rows].join('\n') } }
  }

  const header = '  PID  COMMAND'
  const rows = processes.map(
    (p) => `${String(p.pid).padStart(5)}  ${p.command} ${p.args.join(' ')}`
  )
  return { success: true, data: { output: [header, ...rows].join('\n') } }
}
