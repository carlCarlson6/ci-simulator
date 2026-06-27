import { CommandHandler } from './types'
import { themes, getTheme } from '../themes'

export const MANUAL = 'theme\n\nSwitch color theme or list available themes.\n\nUsage: theme [name]'
export const HELP_TEXT = '  theme <name>          Switch color theme'

export const handler: CommandHandler = (args, context) => {
  if (args.length === 0) {
    const lines = ['Available themes:']
    for (const t of themes) {
      const marker = context.currentTheme === t.name ? '* ' : '  '
      lines.push(`${marker}${t.name.padEnd(11)} ${t.label}`)
    }
    return { success: true, data: { output: lines.join('\n') } }
  }

  const name = args[0]
  const theme = getTheme(name)
  if (!theme) {
    const valid = themes.map((t) => t.name).join(', ')
    return {
      success: false,
      error: `Error: unknown theme "${name}"\nAvailable themes: ${valid}`,
    }
  }

  context.setTheme(name)
  return { success: true, data: { output: `Theme changed to: ${theme.label}` } }
}
