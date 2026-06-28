import type { CommandHandler } from './types'

export const MANUAL = `fbsave — Save framebuffer to a file

Usage:
  fbsave <filename>     Save screenshot to filesystem`

export const HELP_TEXT = 'Save framebuffer screenshot'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'fbsave: missing filename' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    context.fileSystem.writeFile(resolved, '[framebuffer screenshot]')
    return { success: true, data: { output: `Screenshot saved to ${resolved}` } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
