import type { CommandHandler } from './types'

export const MANUAL = `who — Show who is logged in

Usage:
  who    Display logged-in users`

export const HELP_TEXT = 'Show who is logged in'

export const handler: CommandHandler = (args, context) => {
  const user = context.user || 'user'
  const now = new Date().toString()
  return { success: true, data: { output: `${user}    pts/0    ${now}` } }
}
