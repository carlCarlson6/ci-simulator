import { createServerFn } from '@tanstack/react-start'

export type ServerStatePayload = {
  v: 1
  fileSystem: [string, { type: 'file' | 'directory'; content?: string }][]
  currentPath: string
  theme: string
  envVars: Record<string, string>
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const cookie of cookieHeader.split(';')) {
    const idx = cookie.indexOf('=')
    if (idx > -1) {
      const key = cookie.slice(0, idx).trim()
      const val = cookie.slice(idx + 1).trim()
      if (key) cookies[key] = val
    }
  }
  return cookies
}

async function getUserId(request: Request): Promise<string | null> {
  try {
    const { verifyToken } = await import('@clerk/backend')
    const cookies = parseCookies(request.headers.get('cookie') || '')
    const sessionToken = cookies['__session']
    if (!sessionToken) return null
    const payload = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    return (payload.sub as string) || null
  } catch {
    return null
  }
}

async function withRedis<T>(fn: (redis: import('ioredis').Redis) => Promise<T>): Promise<T> {
  const { Redis } = await import('ioredis')
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
  try {
    return await fn(redis)
  } finally {
    await redis.quit()
  }
}

export const saveServerStateFn = createServerFn({ method: 'POST' })
  .validator((data: unknown): ServerStatePayload => {
    return data as ServerStatePayload
  })
  .handler(async (ctx) => {
    const userId = await getUserId(ctx.request)
    if (!userId) return { ok: false }

    await withRedis(async (redis) => {
      const key = `ci-simulator:state:${userId}`
      await redis.set(key, JSON.stringify(ctx.data), 'EX', 60 * 60 * 24 * 30)
    })

    return { ok: true }
  })

export const loadServerStateFn = createServerFn({ method: 'GET' })
  .handler(async (ctx) => {
    const userId = await getUserId(ctx.request)
    if (!userId) return null

    const raw = await withRedis(async (redis) => {
      const key = `ci-simulator:state:${userId}`
      return await redis.get(key)
    })

    if (!raw) return null
    return JSON.parse(raw) as ServerStatePayload
  })

export function syncStateToServer(): void {
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

  saveServerStateFn({ data: { v: 1, fileSystem, currentPath, theme, envVars } })
    .catch(() => { /* silent fail */ })
}

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

export async function loadStateFromServer(): Promise<ServerStatePayload | null> {
  try {
    const data = await loadServerStateFn()
    if (!data || !isValidPayload(data)) return null
    return data
  } catch {
    return null
  }
}
