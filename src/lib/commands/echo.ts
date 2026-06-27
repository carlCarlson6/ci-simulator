import { CommandHandler } from './types'

export const MANUAL = 'echo\n\nPrint text to the terminal.\n\nUsage: echo <text>'
export const HELP_TEXT = '  echo <text>           Print text'

export const handler: CommandHandler = (args) => ({
  success: true,
  data: { output: args.join(' ') },
})
