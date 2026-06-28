import type { FileSystem } from './fileSystem'
import { saveFileSystem } from './persistence'
import { syncStateToServer } from './serverStorage'

const LS_KEYS = {
  currentPath: 'ci-simulator:currentPath',
  theme: 'ci-simulator:theme',
  envVars: 'ci-simulator:envVars',
} as const

export function persistState(
  fs: FileSystem,
  currentPath: string,
  theme: string,
  envVars: Record<string, string>,
): void {
  saveFileSystem(fs)
  localStorage.setItem(LS_KEYS.currentPath, currentPath)
  localStorage.setItem(LS_KEYS.theme, theme)
  localStorage.setItem(LS_KEYS.envVars, JSON.stringify(envVars))
}

export async function syncToServerIfUser(user: string | null): Promise<void> {
  if (!user) return
  await syncStateToServer()
}
