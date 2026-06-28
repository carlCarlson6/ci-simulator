import { createServerFn } from '@tanstack/react-start'
import { verifyToken, createClerkClient } from '@clerk/backend'
import { getCookie } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { userState, staticPages } from './db/schema'
import type { ServerStatePayload } from './db/schema'
import { executeHttpRequest } from './curlServer'

async function getUserId(): Promise<string | null> {
  try {
    const sessionToken = getCookie('__session')
    if (!sessionToken) return null
    const payload = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    return (payload.sub as string) || null
  } catch {
    return null
  }
}

async function withDb<T>(fn: (db: ReturnType<typeof drizzle>) => Promise<T>): Promise<T> {
  const client = postgres(process.env.DATABASE_URL!)
  const db = drizzle(client, { schema: { userState, staticPages } })
  try {
    return await fn(db)
  } finally {
    await client.end()
  }
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

function createDefaultServerState(): ServerStatePayload {
  return {
    v: 1,
    fileSystem: [
      ['/', { type: 'directory' }],
      ['/projects', { type: 'directory' }],
      ['/etc', { type: 'directory' }],
      ['/wwwroot', { type: 'directory' }],
      ['/wwwroot/example', { type: 'directory' }],
      ['/welcome.txt', { type: 'file', content: 'Welcome to the Terminal Simulator!\n\nType `help` to see available commands.\n' }],
      ['/projects/README.md', { type: 'file', content: '# Project: Neural Link\n\nA neural interface for direct brain-computer communication.\n' }],
      ['/WELCOME_OUTPUT', { type: 'file', content: 'Terminal Simulator v1.0.0\nType `help` to see available commands.\n' }],
      ['/wwwroot/example/index.html', { type: 'file', content: '<h1>Hello, World!</h1>\n<p>Welcome to my first page on the virtual terminal.</p>\n<p>This page is served from <code>/wwwroot/example/</code>.</p>\n' }],
      ['/wwwroot/example/style.css', { type: 'file', content: 'body {\n  font-family: system-ui, -apple-system, sans-serif;\n  max-width: 640px;\n  margin: 4rem auto;\n  padding: 0 1rem;\n  background: #faf9f6;\n  color: #1a1a1a;\n  line-height: 1.6;\n}\nh1 { color: #2563eb; }\ncode { background: #e8e8e8; padding: 0.15rem 0.4rem; border-radius: 4px; }\n' }],
    ],
    currentPath: '/',
    theme: 'cyberpunk',
    envVars: {},
  }
}

export const getUser = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const sessionToken = getCookie('__session')
    if (!sessionToken) return null

    const payload = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    const userId = payload.sub as string
    const user = await createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! }).users.getUser(userId)
    const username = user.username || user.firstName || user.emailAddresses[0]?.emailAddress || 'user'
    return { id: userId, username }
  } catch {
    return null
  }
})

export const loadServerState = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const userId = await getUserId()
    if (!userId) return null

    const state = await withDb(async (db) => {
      const rows = await db.select().from(userState).where(eq(userState.userId, userId))
      if (rows.length > 0) return rows[0].data as ServerStatePayload

      const defaultData = createDefaultServerState()
      await db.insert(userState).values({
        userId,
        data: defaultData,
        updatedAt: new Date(),
      })
      return defaultData
    })

    return state
  } catch {
    return null
  }
})

export const saveServerState = createServerFn({ method: 'POST' }).handler(async ({ data }) => {
  try {
    if (!isValidPayload(data)) return { ok: false }

    const userId = await getUserId()
    if (!userId) return { ok: false }

    await withDb(async (db) => {
      await db.insert(userState).values({
        userId,
        data: data as ServerStatePayload,
        updatedAt: new Date(),
      }).onConflictDoUpdate({
        target: userState.userId,
        set: { data: data as ServerStatePayload, updatedAt: new Date() },
      })
    })

    return { ok: true }
  } catch {
    return { ok: false }
  }
})

export const executeCurl = createServerFn({ method: 'POST' }).handler(async ({ data }) => {
  const { url, method, headers, body } = (data ?? {}) as {
    url?: string
    method?: string
    headers?: Record<string, string>
    body?: string
  }

  if (!url || typeof url !== 'string') {
    return { error: 'Invalid request' }
  }

  try {
    const result = await executeHttpRequest(url, method || 'GET', headers, body)
    return {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
      body: result.body,
    }
  } catch (err) {
    return { error: (err as Error).message }
  }
})

export const publishPage = createServerFn({ method: 'POST' }).handler(async ({ data }) => {
  try {
    const userId = await getUserId()
    if (!userId) return { error: 'Authentication required' }

    const { pageName } = (data ?? {}) as { pageName?: string }
    if (!pageName || pageName.includes('..') || pageName.includes('/') || pageName.includes('\0')) {
      return { error: 'Invalid page name' }
    }

    const result = await withDb(async (db) => {
      const existing = await db.select().from(staticPages).where(eq(staticPages.pageName, pageName))

      if (existing.length > 0) {
        const record = existing[0]
        if (record.ownerUserId !== userId) return { error: 'Page name already taken' }
        return { ok: true }
      }

      await db.insert(staticPages).values({
        pageName,
        ownerUserId: userId,
        createdAt: new Date(),
      })

      return { ok: true }
    })

    return result
  } catch (e) {
    console.error('[publishPage] error:', e)
    return { error: 'Internal server error' }
  }
})

type PageContent = { htmlContent: string; cssContent: string } | null

export const getPublishedPage = createServerFn({ method: 'GET' })
  .validator((pageName: string) => pageName)
  .handler(async ({ data: pageName }) => {
    try {
      if (!pageName || pageName.includes('..') || pageName.includes('/') || pageName.includes('\0')) {
        return null
      }

      const client = postgres(process.env.DATABASE_URL!)
      const db = drizzle(client, { schema: { userState, staticPages } })

      try {
        const records = await db.select().from(staticPages).where(eq(staticPages.pageName, pageName))
        if (records.length === 0) return null

        const record = records[0]
        const stateRows = await db.select().from(userState).where(eq(userState.userId, record.ownerUserId))
        if (stateRows.length === 0) return null

        const payload = stateRows[0].data as ServerStatePayload
        const fileSystem = payload.fileSystem
        const dirPrefix = `/wwwroot/${pageName}`

        const htmlEntry = fileSystem.find(([path]) => path === `${dirPrefix}/index.html`)
        if (!htmlEntry || htmlEntry[1].type !== 'file') return null

        const htmlContent = htmlEntry[1].content || ''
        const cssEntry = fileSystem.find(([path]) => path === `${dirPrefix}/style.css`)
        const cssContent = cssEntry && cssEntry[1].type === 'file' ? cssEntry[1].content || '' : ''

        return { htmlContent, cssContent } satisfies PageContent
      } finally {
        await client.end()
      }
    } catch (e) {
      console.error('[getPublishedPage] error:', e)
      return null
    }
  })
