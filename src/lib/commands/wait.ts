import type { CommandHandler } from './types'
import { ProcessManager } from '../processManager'

export const MANUAL = `wait — Wait for background process completion

Usage:
  wait <pid>   Wait for specified process to exit
  wait         Wait for all background processes`

export const HELP_TEXT = 'Wait for background process completion'

export const handler: CommandHandler = (args, context) => {
  const pm = (context as any).processManager as ProcessManager | undefined
  if (!pm) return { success: false, error: 'wait: process manager not available' }

  if (args.length > 0) {
    const pid = parseInt(args[0], 10)
    if (isNaN(pid)) {
      return { success: false, error: `wait: invalid pid: ${args[0]}` }
    }
    const proc = pm.get(pid)
    if (!proc) {
      return { success: false, error: `wait: pid ${pid} is not a child of this shell` }
    }
  }

  return { success: true, data: { output: '' } }
}
