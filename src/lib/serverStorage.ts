import type { ServerStatePayload } from './db/schema'

export type { ServerStatePayload }

function isValidPayload(data: unknown): data is ServerStatePayload {
  if (!data || typeof data !== 'object') return false
  const p = data as Record<string, unknown>
  return (
    p.v === 1 &&
    Array.isArray(p.fileSystem) &&
    typeof p.currentPath === 'string' &&
    typeof p.theme === 'string' &&
    typeof p.envVars === 'object' &&
    p.envVars !== null
  )
}

export async function syncStateToServer(): Promise<void> {
  const fileSystemRaw = localStorage.getItem('ci-simulator:filesystem')
  const currentPath = localStorage.getItem('ci-simulator:currentPath')
  const theme = localStorage.getItem('ci-simulator:theme')
  const envVarsRaw = localStorage.getItem('ci-simulator:envVars')

  if (!currentPath || !theme) return

  let fileSystem: ServerStatePayload['fileSystem'] = []
  try {
    const parsed = JSON.parse(fileSystemRaw || '{}')
    fileSystem = parsed.entries || []
  } catch { /* ignore */ }

  let envVars: Record<string, string> = {}
  try { envVars = JSON.parse(envVarsRaw || '{}') } catch { /* ignore */ }

  await fetch('/api/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { v: 1, fileSystem, currentPath, theme, envVars } }) })
}

export async function loadStateFromServer(): Promise<ServerStatePayload | null> {
  try {
    const res = await fetch('/api/state'); const data = await res.json()
    if (!data || !isValidPayload(data)) return null
    return data
  } catch {
    return null
  }
}
