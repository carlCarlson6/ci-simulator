import type { CommandHandler } from './types'
import { ProcessManager } from '../processManager'

export const MANUAL = `kill — Send a signal to a process

Usage:
  kill -l              List signal names
  kill -<signal> <pid> Send signal to process
  kill <pid>           Send SIGTERM (15) to process

Signals:
  1   SIGHUP    Hangup
  2   SIGINT    Interrupt
  9   SIGKILL   Kill (cannot be caught)
  15  SIGTERM   Termination (default)
  18  SIGCONT   Continue
  19  SIGSTOP   Stop`

export const HELP_TEXT = 'Send a signal to a process'

export const handler: CommandHandler = (args, context) => {
  const pm = (context as any).processManager as ProcessManager | undefined
  if (!pm) return { success: false, error: 'kill: process manager not available' }

  if (args.length === 0) {
    return { success: false, error: 'kill: usage: kill [-signal] <pid>' }
  }

  if (args[0] === '-l') {
    return { success: true, data: { output: ' 1) SIGHUP   2) SIGINT   9) SIGKILL  15) SIGTERM  18) SIGCONT  19) SIGSTOP' } }
  }

  let signal = 15
  let pidStr: string

  if (args[0].startsWith('-')) {
    const sigArg = args[0].slice(1)
    signal = sigArg === 'SIGTERM' ? 15
      : sigArg === 'SIGKILL' || sigArg === '9' ? 9
      : sigArg === 'SIGHUP' || sigArg === '1' ? 1
      : sigArg === 'SIGINT' || sigArg === '2' ? 2
      : sigArg === 'SIGSTOP' || sigArg === '19' ? 19
      : sigArg === 'SIGCONT' || sigArg === '18' ? 18
      : parseInt(sigArg, 10) || 15
    pidStr = args[1]
  } else {
    pidStr = args[0]
  }

  const pid = parseInt(pidStr, 10)
  if (isNaN(pid)) {
    return { success: false, error: `kill: invalid pid: ${pidStr}` }
  }

  const proc = pm.get(pid)
  if (!proc) {
    return { success: false, error: `kill: kill: ${pid}: no such process` }
  }

  pm.kill(pid, signal)
  return { success: true, data: { output: '' } }
}
