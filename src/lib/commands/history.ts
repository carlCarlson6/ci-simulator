import { CommandHandler } from './types'

export const MANUAL = 'history\n\nShow command history.\n\nUsage: history'
export const HELP_TEXT = '  history               Show command history'

export const handler: CommandHandler = (_args, context) => {
  if (context.history.length === 0) {
    return { success: true, data: { output: 'No commands in history' } }
  }
  const lines = context.history.map((cmd, index) => {
    const num = String(index + 1).padStart(4, ' ')
    return `${num}  ${cmd}`
  })
  return { success: true, data: { output: lines.join('\n') } }
}
