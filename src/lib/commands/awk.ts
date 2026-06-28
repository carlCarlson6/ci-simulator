import type { CommandHandler } from './types'

export const MANUAL = `awk — Pattern scanning and processing

Usage:
  awk '{print $1}' <file>     Print first field of each line
  awk <pattern> <file>        Pattern matching`

export const HELP_TEXT = 'Pattern scanning and processing'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'awk: missing program' }
  }

  const pipedInput = context.pipedInput
  const program = args[0]
  const fileArg = args[1]

  try {
    let lines: string[]

    if (fileArg) {
      const resolved = context.fileSystem.resolvePath(fileArg, context.currentPath)
      const content = context.fileSystem.readFile(resolved)
      lines = content.split('\n')
    } else if (pipedInput) {
      lines = pipedInput
    } else {
      return { success: false, error: 'awk: no input' }
    }

    const printMatch = program.match(/\{print\s+\$(\d+)\}/)
    if (printMatch) {
      const fieldIdx = parseInt(printMatch[1], 10) - 1
      const result = lines.map((line) => {
        const fields = line.split(/\s+/)
        return fields[fieldIdx] || ''
      }).filter(Boolean)
      return { success: true, data: { output: result.join('\n') } }
    }

    return { success: true, data: { output: lines.join('\n') } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
