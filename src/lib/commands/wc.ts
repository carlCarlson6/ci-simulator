import type { CommandHandler } from './types'

export const MANUAL = `wc — Count lines, words, and characters

Usage:
  wc <file>     Count lines, words, chars
  wc -l <file>  Count lines only
  wc -w <file>  Count words only`

export const HELP_TEXT = 'Count lines, words, characters'

export const handler: CommandHandler = (args, context) => {
  const countLines = args.includes('-l') || (!args.includes('-w') && !args.includes('-c'))
  const countWords = args.includes('-w') || (!args.includes('-l') && !args.includes('-c'))
  const countChars = args.includes('-c') || (!args.includes('-l') && !args.includes('-w'))
  const fileArgs = args.filter((a) => !a.startsWith('-'))

  const pipedInput = context.pipedInput

  if (fileArgs.length === 0 && pipedInput && pipedInput.length > 0) {
    const text = pipedInput.join('\n')
    const parts: string[] = []
    if (countLines) parts.push(String(pipedInput.length))
    if (countWords) parts.push(String(text.split(/\s+/).filter(Boolean).length))
    if (countChars) parts.push(String(text.length))
    return { success: true, data: { output: parts.join(' ') } }
  }

  if (fileArgs.length === 0) {
    return { success: false, error: 'wc: missing file operand' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(fileArgs[0], context.currentPath)
    const content = context.fileSystem.readFile(resolved)
    const lines = content.split('\n')
    const parts: string[] = []
    if (countLines) parts.push(String(lines.length))
    if (countWords) parts.push(String(content.split(/\s+/).filter(Boolean).length))
    if (countChars) parts.push(String(content.length))
    return { success: true, data: { output: parts.join(' ') + ' ' + fileArgs[0] } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
