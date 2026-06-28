import type { CommandHandler } from './types'

export const MANUAL = `local — Declare a local variable in a function

Usage:
  local <name>=<value>    Set local variable`

export const HELP_TEXT = 'Declare local variable'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    return { success: false, error: 'local: missing argument' }
  }

  const exportVars: Record<string, string> = {}
  for (const arg of args) {
    const eqIdx = arg.indexOf('=')
    if (eqIdx > 0) {
      exportVars[arg.slice(0, eqIdx)] = arg.slice(eqIdx + 1)
    }
  }

  return { success: true, data: { output: '', exportVars } }
}
