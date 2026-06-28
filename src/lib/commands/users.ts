import type { CommandHandler } from './types'

export const MANUAL = `users — List logged-in users

Usage:
  users    Display usernames of logged-in users`

export const HELP_TEXT = 'List logged-in users'

export const handler: CommandHandler = (args, context) => {
  return { success: true, data: { output: context.user || 'user' } }
}
