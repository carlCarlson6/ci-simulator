import type { CommandHandler } from './types'

export const MANUAL = `sed — Stream editor

Usage:
  sed 's/foo/bar/g' <file>     Replace text in file`

export const HELP_TEXT = 'Stream editor'

export const handler: CommandHandler = (args, context) => {
  if (args.length < 2) {
    return { success: false, error: 'sed: missing operand' }
  }

  const expr = args[0]
  const file = args[1]

  try {
    const resolved = context.fileSystem.resolvePath(file, context.currentPath)
    let content = context.fileSystem.readFile(resolved)

    const match = expr.match(/^s\/(.+?)\/(.*?)\/([g]?)$/)
    if (match) {
      const pattern = match[1]
      const replacement = match[2]
      const global = match[3] === 'g'
      content = global
        ? content.replace(new RegExp(pattern, 'g'), replacement)
        : content.replace(new RegExp(pattern), replacement)
    }

    context.fileSystem.writeFile(resolved, content)
    return { success: true, data: { output: '' } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
