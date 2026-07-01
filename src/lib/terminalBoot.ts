// src/lib/terminalBoot.ts
// One-time client-side boot of the shared terminal session. Both the
// fullscreen terminal (/) and the desktop (/desktop) call this on mount;
// whichever mounts first hydrates the store, and later client-side
// navigations keep the running session instead of re-initializing it.
import { useTerminalStore } from './terminalStore'
import type { ServerStatePayload } from './serverStorage'

let booted = false

export function bootTerminalSession(
  serverUser: { id: string; username: string } | null,
  serverState: ServerStatePayload | null
): void {
  if (booted) return
  booted = true
  ;(window as any).__START_TIME = Date.now()

  const store = useTerminalStore.getState()
  store.initialize()

  if (serverUser) {
    store.setUser(serverUser.username)
    store.setUserInfo({
      id: serverUser.id,
      email: '',
      username: serverUser.username,
    })
  }

  if (serverState) {
    useTerminalStore.getState().restoreServerState(serverState)
  }
}
