import { CommandHandler } from './types'
import { clerkSignOut } from '../auth'

export const MANUAL = 'logout\n\nSign out from Clerk.\n\nUsage: logout'
export const HELP_TEXT = '  logout                Sign out'

export const handler: CommandHandler = (_args, context) => {
  if (!context.user) {
    return { success: false, error: 'Not logged in' }
  }
  const error = clerkSignOut()
  if (error) {
    return { success: false, error }
  }
  return { success: true, data: { output: 'Signed out successfully.' } }
}
