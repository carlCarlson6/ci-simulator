import { CommandHandler } from './types'

export const MANUAL = 'rm\n\nRemove files or directories.\n\nUsage: rm [-r] <target>\n  -r    Remove directories recursively'
export const HELP_TEXT = '  rm [-r] <target>      Remove file or directory'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'rm: missing operand' }
  }

  const recursive = args.includes('-r') || args.includes('-rf')
  const targets = args.filter((arg) => !arg.startsWith('-'))
  const errors: string[] = []

  for (const target of targets) {
    try {
      const resolved = context.fileSystem.resolvePath(target, context.currentPath)

      // Easter egg: rm -rf /
      if (resolved === '/' && recursive) {
        errors.push("rm: it is dangerous to operate recursively on '/'")
        errors.push('rm: operation cancelled')
        continue
      }

      context.fileSystem.removeEntry(resolved, recursive)
    } catch (error) {
      errors.push((error as Error).message)
    }
  }

  if (errors.length > 0) {
    return { success: false, error: errors.join('\n') }
  }

  return { success: true, data: { output: '' } }
}
