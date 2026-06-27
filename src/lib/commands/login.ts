import { CommandHandler } from './types'
import { openClerkSignIn } from '../auth'

export const MANUAL = 'login\n\nOpen Clerk authentication modal.\n\nUsage: login'
export const HELP_TEXT = '  login                 Open authentication modal'

export const handler: CommandHandler = () => {
  const error = openClerkSignIn()
  if (error) {
    return { success: false, error }
  }
  return { success: true, data: { output: 'Opening authentication...' } }
}
