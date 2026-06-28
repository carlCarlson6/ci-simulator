import { CommandHandler, CommandEffect } from './types'
import { FileSystem } from '../fileSystem'
import { clearFileSystemStorage } from '../persistence'
import { syncToServerIfUser } from '../sync'
import { useTerminalStore } from '../terminalStore'
import { getTheme } from '../themes'

export const MANUAL = 'reset\n\nReset the terminal to its default state. Clears all local data and, if authenticated, syncs the default state to the server.\n\nUsage: reset'
export const HELP_TEXT = '  reset                 Reset terminal to default state'

export const handler: CommandHandler = (_args, _context) => {
  return { success: true }
}

export const effect: CommandEffect = (_result, context) => {
  for (const key of ['ci-simulator:filesystem', 'ci-simulator:currentPath', 'ci-simulator:theme', 'ci-simulator:envVars']) {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  }
  clearFileSystemStorage()

  const fs = new FileSystem()
  fs.initializeDefaults()

  const store = useTerminalStore.getState()
  store.setTheme('cyberpunk')

  useTerminalStore.setState({
    fileSystem: fs,
    currentPath: '/',
    previousPath: '/',
    history: [],
    envVars: {},
  })

  context.addLine('system', 'Terminal reset to default state.')

  if (store.user) {
    syncToServerIfUser(store.user).catch(() => {
      context.addLine('error', 'State could not be saved to server.')
    })
  }

  return 'continue'
}
