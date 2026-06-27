import { CommandHandler } from './types'
import { renderFileSystemTree, renderTreeFromPath, formatLsLong } from './utils'

export const MANUAL = 'ls\n\nList directory contents.\n\nUsage: ls [options] [path]\nOptions:\n  -a       Show hidden files\n  -l       Long format with permissions, size, date\n  -tree    Show directory tree from current (or given) path\n  -gtree   Show global directory tree from root'
export const HELP_TEXT = '  ls [-a] [-l] [-tree] [-gtree] [path]  List directory contents'

export const handler: CommandHandler = (args, context) => {
  const showHidden = args.includes('-a') || args.includes('-la') || args.includes('-al')
  const longFormat = args.includes('-l') || args.includes('-la') || args.includes('-al')
  const treeLocal = args.includes('-tree')
  const treeGlobal = args.includes('-gtree')
  const pathArg = args.find((arg) => !arg.startsWith('-'))

  if (treeGlobal) {
    return {
      success: true,
      data: { output: renderFileSystemTree(context.fileSystem) },
    }
  }

  const path = pathArg || context.currentPath

  if (treeLocal) {
    try {
      const tree = renderTreeFromPath(context.fileSystem, path)
      return { success: true, data: { output: tree } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  try {
    const resolved = context.fileSystem.resolvePath(path, context.currentPath)
    const entries = context.fileSystem.listDirectory(resolved)

    const filtered = showHidden ? entries : entries.filter((name) => !name.startsWith('.'))

    if (filtered.length === 0) {
      return { success: true, data: { output: '' } }
    }

    if (longFormat) {
      const formatted = filtered.map((name) => formatLsLong(context.fileSystem, resolved, name))
      return { success: true, data: { output: formatted.join('\n') } }
    }

    const formatted = filtered.map((name) => {
      const fullPath = resolved === '/' ? '/' + name : resolved + '/' + name
      return context.fileSystem.getEntry(fullPath)?.type === 'directory' ? `${name}/` : name
    })

    return { success: true, data: { output: formatted.join('\n') } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
