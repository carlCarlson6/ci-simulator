import type { CommandHandler } from './types'

const aliases: Record<string, string> = {}

export const MANUAL = `alias — Create command aliases

Usage:
  alias <name>='<command>'    Create alias
  alias <name>                Show alias value
  alias                       List all aliases`

export const HELP_TEXT = 'Create command aliases'

export const handler: CommandHandler = (args, _context) => {
  if (args.length === 0) {
    const lines = Object.entries(aliases).map(([k, v]) => `alias ${k}='${v}'`)
    return { success: true, data: { output: lines.join('\n') || 'no aliases' } }
  }

  const eqIdx = args[0].indexOf('=')
  if (eqIdx > 0) {
    const name = args[0].slice(0, eqIdx)
    let value = args[0].slice(eqIdx + 1)
    value = value.replace(/^['"]|['"]$/g, '')
    aliases[name] = value
    return { success: true, data: { output: '' } }
  }

  if (aliases[args[0]]) {
    return { success: true, data: { output: `alias ${args[0]}='${aliases[args[0]]}'` } }
  }

  return { success: false, error: `alias: ${args[0]}: not found` }
}

export function getAliases(): Record<string, string> {
  return { ...aliases }
}
