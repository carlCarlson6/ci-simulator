import { CommandHandler } from './types'

export const MANUAL = 'cowsay\n\nGenerate an ASCII cow with a speech bubble.\n\nUsage: cowsay [message]'
export const HELP_TEXT = '  cowsay [message]      ASCII cow'

export const handler: CommandHandler = (args) => {
  const message = args.join(' ') || 'Hello, world!'
  const bubbleWidth = Math.min(message.length + 2, 40)
  const bubble = ` ${'_'.repeat(bubbleWidth)}\n< ${message.padEnd(bubbleWidth - 2, ' ')} >\n ${'-'.repeat(bubbleWidth)}`

  const cow = [
    '        \\   ^__^',
    '         \\  (oo)\\_______',
    '            (__)\\       )\\/\\',
    '                ||----w |',
    '                ||     ||',
  ]

  return { success: true, data: { output: bubble + '\n' + cow.join('\n') } }
}
