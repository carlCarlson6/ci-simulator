import type { CommandHandler } from './types'

export const MANUAL = `sudo — Execute a command as another user

Usage:
  sudo <command> [args...]     Execute as root
  sudo -u <user> <command>     Execute as specified user`

export const HELP_TEXT = 'Execute command as another user'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'sudo: missing command' }
  }

  let user = 'root'
  let cmdArgs: string[] = []

  if (args[0] === '-u' && args[1]) {
    user = args[1]
    cmdArgs = args.slice(2)
  } else {
    cmdArgs = args
  }

  if (cmdArgs.length === 0) {
    return { success: false, error: 'sudo: missing command' }
  }

  return { success: true, data: { output: `sudo (${user}): ${cmdArgs.join(' ')} (simulated)` } }
}
