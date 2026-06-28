import { CommandHandler, CommandEffect } from './types'

export const MANUAL = 'cd\n\nChange the current directory.\n\nUsage: cd <path>\n  cd ~       Go to root directory\n  cd -       Go to previous directory'
export const HELP_TEXT = '  cd <path>            Change directory'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0 || args[0] === '~') {
    return { success: true, data: { newPath: '/' } }
  }

  if (args[0] === '-') {
    return { success: true, data: { newPath: context.previousPath } }
  }

  try {
    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    const entry = context.fileSystem.getEntry(resolved)

    if (!entry) {
      return { success: false, error: `cd: no such file or directory: ${args[0]}` }
    }
    if (entry.type !== 'directory') {
      return { success: false, error: `cd: not a directory: ${args[0]}` }
    }

    return { success: true, data: { newPath: resolved } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

export const effect: CommandEffect = (result, context) => {
  if (result.success && result.data?.newPath) {
    context.setPaths(result.data.newPath, context.currentPath)
  }
  return 'continue'
}
