import { CommandHandler, CommandEffect } from './types'

export const MANUAL = 'export\n\nSet environment variables.\n\nUsage: export KEY=VALUE [...]'
export const HELP_TEXT = '  export KEY=VALUE [...]   Set environment variable'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'export: usage: export KEY=VALUE [...]' }
  }

  const result: Record<string, string> = {}

  for (const arg of args) {
    const eqIndex = arg.indexOf('=')
    if (eqIndex === -1) {
      result[arg] = ''
    } else {
      result[arg.slice(0, eqIndex)] = arg.slice(eqIndex + 1)
    }
  }

  return { success: true, data: { output: '', exportVars: result } }
}

export const effect: CommandEffect = (result, context) => {
  if (result.success && result.data?.exportVars) {
    for (const [key, value] of Object.entries(result.data.exportVars)) {
      context.setEnvVar(key, value)
    }
    return 'handled'
  }
  return 'continue'
}
