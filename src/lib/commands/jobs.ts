import type { CommandHandler } from './types'
import { ProcessManager } from '../processManager'

export const MANUAL = `jobs — List background jobs

Usage:
  jobs     List background jobs for this shell session

Output shows: [job-number] + <pid> <state> <command>`

export const HELP_TEXT = 'List background jobs'

export const handler: CommandHandler = (args, context) => {
  const pm = (context as any).processManager as ProcessManager | undefined
  if (!pm) return { success: false, error: 'jobs: process manager not available' }

  const sessionId = (context as any).sessionId ?? 0
  const procs = pm.getBySession(sessionId).filter((p) => !p.foreground)

  if (procs.length === 0) {
    return { success: true, data: { output: 'No background jobs.' } }
  }

  const lines = procs.map((p, i) => `[${i + 1}] + ${p.pid} ${p.state} ${p.command} ${p.args.join(' ')}`)
  return { success: true, data: { output: lines.join('\n') } }
}
