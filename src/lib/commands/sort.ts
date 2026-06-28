import type { CommandHandler } from './types'

export const MANUAL = `sort — Sort lines of text

Usage:
  sort <file>     Sort file contents
  sort            Sort piped input`

export const HELP_TEXT = 'Sort lines of text'

export const handler: CommandHandler = (args, context) => {
  const fileArg = args.find((a) => !a.startsWith('-'))
  const pipedInput = context.pipedInput

  if (!fileArg && pipedInput) {
    return { success: true, data: { output: [...pipedInput].sort().join('\n') } }
  }

  if (!fileArg) {
    return { success: false, error: 'sort: missing file operand' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(fileArg, context.currentPath)
    const content = context.fileSystem.readFile(resolved)
    const lines = content.split('\n').sort()
    return { success: true, data: { output: lines.join('\n') } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
