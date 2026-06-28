import type { CommandHandler } from './types'
import { ProcessManager } from '../processManager'

export const MANUAL = `fg — Bring a job to the foreground

Usage:
  fg %<job-number>  Bring job to foreground
  fg                Bring current job to foreground`

export const HELP_TEXT = 'Bring job to foreground'

export const handler: CommandHandler = (args, context) => {
  const pm = (context as any).processManager as ProcessManager | undefined
  if (!pm) return { success: false, error: 'fg: process manager not available' }

  const sessionId = (context as any).sessionId ?? 0
  const procs = pm.getBySession(sessionId).filter((p) => !p.foreground)

  if (procs.length === 0) {
    return { success: false, error: 'fg: no current job' }
  }

  let target = procs[procs.length - 1]

  if (args.length > 0 && args[0].startsWith('%')) {
    const idx = parseInt(args[0].slice(1), 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= procs.length) {
      return { success: false, error: `fg: ${args[0]}: no such job` }
    }
    target = procs[idx]
  }

  target.foreground = true
  pm.kill(target.pid, 18)
  return { success: true, data: { output: `${target.command} ${target.args.join(' ')}` } }
}
