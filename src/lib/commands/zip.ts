import type { CommandHandler } from './types'

export const MANUAL = `zip — Package and compress files

Usage:
  zip <archive.zip> <files...>     Create zip archive`

export const HELP_TEXT = 'Package and compress files'

export const handler: CommandHandler = (args, context) => {
  if (args.length < 2) {
    return { success: false, error: 'zip: missing operand' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    context.fileSystem.writeFile(resolved, `[zip archive containing: ${args.slice(1).join(', ')}]`)
    return { success: true, data: { output: `  adding: ${args.slice(1).join('  adding: ')} (deflated 52%)` } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
