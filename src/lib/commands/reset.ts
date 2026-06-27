import { CommandHandler } from './types'
import { clearFileSystemStorage } from '../persistence'

export const MANUAL = 'reset\n\nReset the filesystem to default state and clear localStorage.\n\nUsage: reset'
export const HELP_TEXT = '  reset                 Reset filesystem to defaults (clears storage)'

export const handler: CommandHandler = (_args, context) => {
  clearFileSystemStorage()
  context.fileSystem.clear()
  context.fileSystem.initializeDefaults()
  return {
    success: true,
    data: { output: 'Filesystem reset to defaults. Refresh to apply clean state.' },
  }
}
