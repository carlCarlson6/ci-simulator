import type { CommandHandler } from './types'
import { ShellParser } from '../shellParser'
import { ShellExecutor } from '../shellExecutor'

export const MANUAL = `source — Execute script in current shell context

Usage:
  source <file.sh>     Execute script in current shell`

export const HELP_TEXT = 'Execute script in current shell context'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'source: missing file operand' }
  }

  try {
    const resolved = context.fileSystem.resolvePath(args[0], context.currentPath)
    const content = context.fileSystem.readFile(resolved)
    const parser = new ShellParser(content)
    const nodes = parser.parseProgram()
    const executor = new ShellExecutor(context, context.envVars)
    const result = executor.execute(nodes)
    return { success: result.exitCode === 0, data: { output: result.output.join('\n') } }
  } catch (error) {
    return { success: false, error: `source: ${(error as Error).message}` }
  }
}
