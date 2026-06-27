import { CommandHandler } from './types'

export const MANUAL = 'env\n\nDisplay all environment variables.\n\nUsage: env'
export const HELP_TEXT = '  env                     Display environment variables'

export const handler: CommandHandler = (_args, context) => {
  const entries = Object.entries(context.envVars)
  if (entries.length === 0) {
    return { success: true, data: { output: '' } }
  }

  entries.sort(([a], [b]) => a.localeCompare(b))

  const output = entries.map(([key, value]) => `${key}=${value}`).join('\n')
  return { success: true, data: { output } }
}
