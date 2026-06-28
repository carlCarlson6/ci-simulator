import type { CommandHandler } from './types'

export const MANUAL = `uniq — Remove duplicate lines

Usage:
  uniq <file>     Remove consecutive duplicate lines
  uniq            Remove duplicates from piped input`

export const HELP_TEXT = 'Remove duplicate lines'

export const handler: CommandHandler = (args, context) => {
  const fileArg = args.find((a) => !a.startsWith('-'))
  const pipedInput = context.pipedInput

  const dedupe = (lines: string[]) => {
    return lines.filter((line, i) => i === 0 || line !== lines[i - 1])
  }

  if (!fileArg && pipedInput) {
    return { success: true, data: { output: dedupe(pipedInput).join('\n') } }
  }

  if (!fileArg) {
    return { success: false, error: 'uniq: missing file operand' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(fileArg, context.currentPath)
    const content = context.fileSystem.readFile(resolved)
    const lines = dedupe(content.split('\n'))
    return { success: true, data: { output: lines.join('\n') } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
