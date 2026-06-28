import type { CommandHandler } from './types'

export const MANUAL = `head — Output the first part of files

Usage:
  head <file>       Show first 10 lines
  head -n <N> <file> Show first N lines`

export const HELP_TEXT = 'Output first part of files'

export const handler: CommandHandler = (args, context) => {
  let numLines = 10
  let fileArg: string | undefined

  if (args[0] === '-n' && args[1]) {
    numLines = parseInt(args[1], 10) || 10
    fileArg = args[2]
  } else {
    fileArg = args[0]
  }

  const pipedInput = context.pipedInput

  if (!fileArg && pipedInput) {
    return { success: true, data: { output: pipedInput.slice(0, numLines).join('\n') } }
  }

  if (!fileArg) {
    return { success: false, error: 'head: missing file operand' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(fileArg, context.currentPath)
    const content = context.fileSystem.readFile(resolved)
    const lines = content.split('\n').slice(0, numLines)
    return { success: true, data: { output: lines.join('\n') } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
