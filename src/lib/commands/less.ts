import type { CommandHandler } from './types'

export const MANUAL = `less — Pager for file viewing

Usage:
  less <file>     View file with paging

Navigation: j/k scroll, q quit, / search`

export const HELP_TEXT = 'Pager for file viewing'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    const pipedInput = context.pipedInput
    if (pipedInput && pipedInput.length > 0) {
      return { success: true, data: { output: pipedInput.join('\n') + '\n\n(END)' } }
    }
    return { success: false, error: 'less: missing file operand' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    const content = context.fileSystem.readFile(resolved)
    return { success: true, data: { output: content + '\n\n(END)' } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
