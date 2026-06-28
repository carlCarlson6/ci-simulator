import type { CommandHandler } from './types'

export const MANUAL = `ln — Create links

Usage:
  ln -s <target> <link>     Create symbolic link
  ln <target> <link>        Create hard link (simulated)`

export const HELP_TEXT = 'Create links'

export const handler: CommandHandler = (args, context) => {
  if (args.length < 2) {
    return { success: false, error: 'ln: missing operand' }
  }

  let symbolic = false
  let targetIdx = 0

  if (args[0] === '-s') {
    symbolic = true
    targetIdx = 1
  }

  const target = args[targetIdx]
  const link = args[targetIdx + 1]

  if (!target || !link) {
    return { success: false, error: 'ln: missing operand' }
  }

  try {
    const resolvedTarget = context.fileSystem.resolvePath(target, context.currentPath)
    const resolvedLink = context.fileSystem.resolvePath(link, context.currentPath)

    if (symbolic) {
      context.fileSystem.symlink(resolvedTarget, resolvedLink)
    } else {
      const entry = context.fileSystem.getEntry(resolvedTarget)
      if (!entry) return { success: false, error: `ln: failed to access '${target}': No such file or directory` }
      if (entry.type === 'directory') return { success: false, error: `ln: '${target}': hard link not allowed for directory` }
      context.fileSystem.createFile(resolvedLink, entry.content || '')
    }

    return { success: true, data: { output: '' } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
