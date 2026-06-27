import { CommandHandler, CommandEffect } from './types'

export const MANUAL = 'edit\n\nOpen a file in the text editor.\n\nUsage: edit <file>\n  Creates the file if it does not exist.'
export const HELP_TEXT = '  edit <file>           Open file in text editor'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'edit: missing file operand' }
  }

  const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)

  let content = ''
  try {
    content = context.fileSystem.readFile(resolved)
  } catch {
    // File doesn't exist — will be auto-created on save
  }

  return {
    success: true,
    data: {
      editorFilePath: resolved,
      editorContent: content,
    },
  }
}

export const effect: CommandEffect = (result, context) => {
  if (result.success && result.data?.editorFilePath !== undefined) {
    context.openEditor(
      result.data.editorFilePath,
      result.data.editorContent || ''
    )
    return 'handled'
  }
  return 'continue'
}
