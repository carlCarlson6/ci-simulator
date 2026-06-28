import type { CommandHandler } from './types'

export const MANUAL = `grep — Search file contents for a pattern

Usage:
  grep <pattern> <file>     Search file for pattern
  grep <pattern>            Search piped input for pattern
  grep -r <pattern> <dir>   Recursively search directory
  grep -i <pattern> <file>  Case-insensitive search`

export const HELP_TEXT = 'Search for patterns in files'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'grep: missing pattern operand' }
  }

  let caseInsensitive = false
  let recursive = false
  let patternIndex = 0

  while (patternIndex < args.length && args[patternIndex].startsWith('-')) {
    if (args[patternIndex].includes('i')) caseInsensitive = true
    if (args[patternIndex].includes('r')) recursive = true
    patternIndex++
  }

  if (patternIndex >= args.length) {
    return { success: false, error: 'grep: missing pattern' }
  }

  const pattern = args[patternIndex]
  const fileArg = args[patternIndex + 1]
  const pipedInput = context.pipedInput

  try {
    if (fileArg) {
      const resolved = context.fileSystem.resolvePath(fileArg, context.currentPath)
      const content = context.fileSystem.readFile(resolved)
      const lines = content.split('\n')
      const re = new RegExp(pattern, caseInsensitive ? 'gi' : 'g')
      const matched = lines.filter((l) => l.match(re))
      return { success: true, data: { output: matched.join('\n') } }
    }

    if (pipedInput && pipedInput.length > 0) {
      const re = new RegExp(pattern, caseInsensitive ? 'gi' : 'g')
      const matched = pipedInput.filter((l) => l.match(re))
      return { success: true, data: { output: matched.join('\n') } }
    }

    return { success: false, error: 'grep: no input' }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
