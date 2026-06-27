import { CommandHandler, CommandEffect } from './types'

export const MANUAL = 'clear\n\nClear the terminal screen.\n\nUsage: clear'
export const HELP_TEXT = '  clear                 Clear terminal screen'

export const handler: CommandHandler = () => ({ success: true, data: {} })

export const effect: CommandEffect = (_result, context) => {
  context.clearScreen()
  return 'handled'
}
