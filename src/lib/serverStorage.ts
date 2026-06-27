import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { userState } from './db/schema'
import type { ServerStatePayload } from './db/schema'

export type { ServerStatePayload }

type Db = import('drizzle-orm/postgres-js').PostgresJsDatabase<{ userState: typeof userState }>

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

async function withDb<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not configured')
  }
  const postgres = await import('postgres')
  const { drizzle } = await import('drizzle-orm/postgres-js')
  const client = postgres.default(process.env.DATABASE_URL)
  const db = drizzle(client, { schema: { userState } })
  try {
    return await fn(db)
  } finally {
    await client.end()
  }
}

export const saveServerStateFn = createServerFn({ method: 'POST' })
  .validator((data: unknown): ServerStatePayload => {
    return data as ServerStatePayload
  })
  .handler(async (ctx) => {
    const userId = await getUserId(ctx.request)
    if (!userId) return { ok: false }

    await withDb(async (db) => {
      await db.insert(userState).values({
        userId,
        data: ctx.data,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: userState.userId,
        set: { data: ctx.data, updatedAt: new Date() },
      })
    })

    return { ok: true }
  })

export const loadServerStateFn = createServerFn({ method: 'GET' })
  .handler(async (ctx) => {
    const userId = await getUserId(ctx.request)
    if (!userId) return null

    const rows = await withDb(async (db) => {
      return await db.select().from(userState).where(eq(userState.userId, userId))
    })

    if (rows.length === 0) return null
    return rows[0].data
  })

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

  await saveServerStateFn({ data: { v: 1, fileSystem, currentPath, theme, envVars } })
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
