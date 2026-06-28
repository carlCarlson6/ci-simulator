import { CommandHandler } from './types'
import { openClerkSignIn } from '../auth'
import { useTerminalStore } from '../terminalStore'

export const MANUAL = 'login\n\nOpen Clerk authentication modal.\n\nUsage: login'
export const HELP_TEXT = '  login                 Open authentication modal'

export const handler: CommandHandler = () => {
  const userInfo = useTerminalStore.getState().userInfo
  if (userInfo) {
    const lines = [
      `Already logged in.`,
      `User ID:   ${userInfo.id}`,
      `Email:     ${userInfo.email}`,
      `Username:  ${userInfo.username}`,
    ]
    return { success: true, data: { output: lines.join('\n') } }
  }
  const error = openClerkSignIn()
  if (error) {
    return { success: false, error }
  }
  return { success: true, data: { output: 'Opening authentication...' } }
}
