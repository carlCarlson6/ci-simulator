import type { CommandHandler } from './types'

export const MANUAL = `fbview — Load and display an image in framebuffer

Usage:
  fbview <file>     Load PPM file into framebuffer`

export const HELP_TEXT = 'View image in framebuffer'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'fbview: missing filename' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    const content = context.fileSystem.readFile(resolved)
    return { success: true, data: { output: `Loaded ${resolved} (${content.length} bytes)` } }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
