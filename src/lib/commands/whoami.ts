import { CommandHandler } from './types'

export const MANUAL = 'whoami\n\nDisplay current user.\n\nUsage: whoami'
export const HELP_TEXT = '  whoami                Display current user'

export const handler: CommandHandler = (_args, context) => {
  const name = context.user || 'anonymous'
  return { success: true, data: { output: name } }
}
