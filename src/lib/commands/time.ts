import type { CommandHandler } from './types'

export const MANUAL = `time — Time command execution

Usage:
  time <command> [args...]     Time the execution of a command`

export const HELP_TEXT = 'Time command execution'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'time: missing command' }
  }

  const start = performance.now()
  const elapsed = ((performance.now() - start) / 1000).toFixed(3)

  return {
    success: true,
    data: {
      output: `\nreal\t${elapsed}s\nuser\t${elapsed}s\nsys\t0.000s`,
    },
  }
}
