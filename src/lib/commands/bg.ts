import type { CommandHandler } from './types'
import { ProcessManager } from '../processManager'

export const MANUAL = `bg — Resume a job in the background

Usage:
  bg %<job-number>  Resume job in background
  bg                Resume the current job`

export const HELP_TEXT = 'Resume job in background'

export const handler: CommandHandler = (args, context) => {
  const pm = (context as any).processManager as ProcessManager | undefined
  if (!pm) return { success: false, error: 'bg: process manager not available' }

  const sessionId = (context as any).sessionId ?? 0
  const procs = pm.getBySession(sessionId).filter((p) => !p.foreground)

  if (procs.length === 0) {
    return { success: false, error: 'bg: no current job' }
  }

  let target = procs[procs.length - 1]

  if (args.length > 0 && args[0].startsWith('%')) {
    const idx = parseInt(args[0].slice(1), 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= procs.length) {
      return { success: false, error: `bg: ${args[0]}: no such job` }
    }
    target = procs[idx]
  }

  pm.kill(target.pid, 18)
  return { success: true, data: { output: `[${procs.indexOf(target) + 1}] + ${target.pid} ${target.command} &` } }
}
