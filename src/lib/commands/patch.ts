import type { CommandHandler } from './types'

export const MANUAL = `patch — Apply a diff file

Usage:
  patch <file.diff>     Apply changes from diff file`

export const HELP_TEXT = 'Apply a diff file'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'patch: missing file' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    context.fileSystem.readFile(resolved)
    return { success: true, data: { output: 'patching file ...\nPatch applied successfully (simulated)' } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
