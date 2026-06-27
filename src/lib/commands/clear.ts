import { CommandHandler } from './types'

export const MANUAL = 'clear\n\nClear the terminal screen.\n\nUsage: clear'
export const HELP_TEXT = '  clear                 Clear terminal screen'

export const handler: CommandHandler = () => ({ success: true, data: {} })
