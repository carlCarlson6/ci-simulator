import type { CommandHandler } from './types'

export const MANUAL = `du — Estimate file space usage

Usage:
  du <path>       Show disk usage for path
  du -sh <path>   Summary in human-readable format`

export const HELP_TEXT = 'Estimate file space usage'

export const handler: CommandHandler = (args, context) => {
  const human = args.includes('-h') || args.includes('-sh')
  const targetArg = args.filter((a) => !a.startsWith('-'))[0]

  try {
    const target = targetArg ? context.fileSystem.resolvePath(targetArg, context.currentPath) : context.currentPath
    const entry = context.fileSystem.getEntry(target)
    if (!entry) return { success: false, error: `du: cannot access '${targetArg || '.'}': No such file or directory` }

    if (entry.type === 'file') {
      const size = (entry.content || '').length
      const sizeStr = human ? `${(size / 1024).toFixed(1)}K` : `${size}`
      return { success: true, data: { output: `${sizeStr}\t${targetArg || entry.content ? target : targetArg || '.'}` } }
    }

    let totalSize = 0
    for (const [key, val] of context.fileSystem.entries) {
      if (key.startsWith(target) && val.type === 'file' && val.content) {
        totalSize += val.content.length
      }
    }
    const sizeStr = human ? `${(totalSize / 1024).toFixed(1)}K` : `${totalSize}`
    return { success: true, data: { output: `${sizeStr}\t${targetArg || '.'}` } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
