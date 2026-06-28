import type { CommandHandler } from './types'

export const MANUAL = `diff — Compare files line by line

Usage:
  diff <file1> <file2>     Show differences between files`

export const HELP_TEXT = 'Compare files line by line'

export const handler: CommandHandler = (args, context) => {
  if (args.length < 2) {
    return { success: false, error: 'diff: missing operand' }
  }

  try {
    const resolved1 = context.fileSystem.resolvePath(args[0], context.currentPath)
    const resolved2 = context.fileSystem.resolvePath(args[1], context.currentPath)
    const content1 = context.fileSystem.readFile(resolved1).split('\n')
    const content2 = context.fileSystem.readFile(resolved2).split('\n')

    const maxLen = Math.max(content1.length, content2.length)
    const diffs: string[] = []

    for (let i = 0; i < maxLen; i++) {
      if (content1[i] !== content2[i]) {
        if (i < content1.length && i < content2.length) {
          diffs.push(`- ${content1[i]}`)
          diffs.push(`+ ${content2[i]}`)
        } else if (i < content1.length) {
          diffs.push(`- ${content1[i]}`)
        } else {
          diffs.push(`+ ${content2[i]}`)
        }
      }
    }

    if (diffs.length === 0) {
      return { success: true, data: { output: '' } }
    }

    return { success: true, data: { output: diffs.join('\n') } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
