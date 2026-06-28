import { CommandHandler } from './types'
import { useTerminalStore } from '../terminalStore'

export const MANUAL = 'whoami\n\nDisplay current user.\n\nUsage: whoami'
export const HELP_TEXT = '  whoami                Display current user'

export const handler: CommandHandler = () => {
  const userInfo = useTerminalStore.getState().userInfo
  if (userInfo) {
    const lines = [
      `User ID:   ${userInfo.id}`,
      `Email:     ${userInfo.email}`,
      `Username:  ${userInfo.username}`,
    ]
    return { success: true, data: { output: lines.join('\n') } }
  }
  return { success: true, data: { output: 'anonymous' } }
}
