import type { CommandHandler } from './types'

export const MANUAL = `last — Show login history

Usage:
  last    Display login history`

export const HELP_TEXT = 'Show login history'

export const handler: CommandHandler = (args, context) => {
  const user = context.user || 'user'
  return { success: true, data: { output:
    `${user}    pts/0    ${new Date().toLocaleDateString()}   00:00   still logged in\nreboot   system boot  ${new Date().toLocaleDateString()}   00:00   still running`
  } }
}
