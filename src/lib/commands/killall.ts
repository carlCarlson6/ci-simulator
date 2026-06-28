import type { CommandHandler } from './types'
import { ProcessManager } from '../processManager'

export const MANUAL = `killall — Kill processes by name

Usage:
  killall <name>     Kill all processes named <name>
  killall -9 <name>  Force kill`

export const HELP_TEXT = 'Kill processes by name'

export const handler: CommandHandler = (args, context) => {
  const pm = (context as any).processManager as ProcessManager | undefined
  if (!pm) return { success: false, error: 'killall: process manager not available' }

  if (args.length === 0) {
    return { success: false, error: 'killall: usage: killall <name>' }
  }

  let signal = 15
  let name: string

  if (args[0] === '-9') {
    signal = 9
    name = args[1]
  } else {
    name = args[0]
  }

  const targets = pm.getByCommand(name)
  if (targets.length === 0) {
    return { success: true, data: { output: `${name}: no process found` } }
  }

  for (const proc of targets) {
    pm.kill(proc.pid, signal)
  }

  return { success: true, data: { output: `Killed ${targets.length} process(es)` } }
}
