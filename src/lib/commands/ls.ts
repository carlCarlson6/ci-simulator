import { CommandHandler } from './types'
import { formatLsLong } from './utils'

export const MANUAL = 'ls\n\nList directory contents.\n\nUsage: ls [options] [path]\nOptions:\n  -a       Show hidden files\n  -l       Long format with permissions, size, date'
export const HELP_TEXT = '  ls [-a] [-l] [path]                   List directory contents'

export const handler: CommandHandler = (args, context) => {
  const showHidden = args.includes('-a') || args.includes('-la') || args.includes('-al')
  const longFormat = args.includes('-l') || args.includes('-la') || args.includes('-al')
  const pathArg = args.find((arg) => !arg.startsWith('-'))
  const path = pathArg || context.currentPath

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
