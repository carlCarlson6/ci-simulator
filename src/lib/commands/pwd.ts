import { CommandHandler } from './types'

export const MANUAL = 'pwd\n\nPrint the current working directory.\n\nUsage: pwd'
export const HELP_TEXT = '  pwd                  Print working directory'

export const handler: CommandHandler = (_args, context) => ({
  success: true,
  data: { output: context.currentPath },
})
