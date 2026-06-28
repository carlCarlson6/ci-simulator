import type { CommandHandler } from './types'

export const MANUAL = `id — Print user and group ID

Usage:
  id            Show current user ID
  id <username> Show user ID for username`

export const HELP_TEXT = 'Print user and group ID'

export const handler: CommandHandler = (args, context) => {
  const user = context.user || 'user'
  if (args.length > 0) {
    return { success: true, data: { output: `uid=1000(${args[0]}) gid=1000(${args[0]}) groups=1000(${args[0]})` } }
  }
  return { success: true, data: { output: `uid=1000(${user}) gid=1000(${user}) groups=1000(${user}),1001(wheel)` } }
}
