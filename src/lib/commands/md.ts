import { CommandHandler, CommandEffect } from './types'

export const MANUAL = 'md\n\nRender markdown file contents as formatted HTML.\n\nUsage: md <file>'
export const HELP_TEXT = '  md <file>            Render markdown file'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'md: missing file operand' }
  }

  const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
  const entry = context.fileSystem.getEntry(resolved)

  if (!entry) {
    return { success: false, error: `md: ${args[0]}: No such file or directory` }
  }

  if (entry.type === 'directory') {
    return { success: false, error: `md: ${args[0]}: Is a directory` }
  }

  const content = context.fileSystem.readFile(resolved)

  return {
    success: true,
    data: {
      markdownFilePath: resolved,
      markdownContent: content,
    },
  }
}

export const effect: CommandEffect = (result, context) => {
  if (result.success && result.data?.markdownFilePath !== undefined) {
    context.openMarkdown(
      result.data.markdownFilePath,
      result.data.markdownContent || ''
    )
    return 'handled'
  }
  return 'continue'
}
