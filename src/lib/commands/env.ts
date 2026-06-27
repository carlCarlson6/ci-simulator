import { CommandHandler } from './types'

export const MANUAL = `env

Display environment variables.

Usage: env [VAR_NAME]
  With no arguments, display all environment variables (sorted).
  With a variable name, display its value.`
export const HELP_TEXT = '  env [VAR_NAME]          Display environment variables'

export const handler: CommandHandler = (args, context) => {
  if (args.length > 0) {
    const value = context.envVars[args[0]]
    return { success: true, data: { output: value ?? '' } }
  }

  const entries = Object.entries(context.envVars)
  if (entries.length === 0) {
    return { success: true, data: { output: '' } }
  }

  entries.sort(([a], [b]) => a.localeCompare(b))

  const output = entries.map(([key, value]) => `${key}=${value}`).join('\n')
  return { success: true, data: { output } }
}
