import type { CommandHandler } from './types'

export const MANUAL = `nohup — Run a command immune to hangups

Usage:
  nohup <command> [args...]

Runs the specified command and ignores SIGHUP signals.`

export const HELP_TEXT = 'Run command immune to hangups'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'nohup: usage: nohup <command> [args...]' }
  }

  return { success: true, data: { output: `nohup: running ${args[0]} in background` } }
}
