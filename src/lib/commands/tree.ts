import { CommandHandler } from './types'
import { renderTreeFromPath } from './utils'

export const MANUAL = 'tree\n\nShow directory tree from current (or given) path.\n\nUsage: tree [path]'
export const HELP_TEXT = '  tree [path]           Show directory tree from current or given path'

export const handler: CommandHandler = (args, context) => {
  const pathArg = args.find((arg) => !arg.startsWith('-'))
  const path = pathArg || context.currentPath

  try {
    const tree = renderTreeFromPath(context.fileSystem, path)
    return { success: true, data: { output: tree } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
