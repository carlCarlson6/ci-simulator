import type { CommandHandler } from './types'

export const MANUAL = `groups — Show group memberships

Usage:
  groups              Show current user's groups
  groups <username>   Show user's groups`

export const HELP_TEXT = 'Show group memberships'

export const handler: CommandHandler = (args, context) => {
  const user = args[0] || context.user || 'user'
  return { success: true, data: { output: `${user} : ${user} wheel` } }
}
