import { createFileRoute } from '@tanstack/react-router'
import { getCookie } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { userState } from '../../lib/db/schema'

type ServerStatePayload = import('../../lib/db/schema').ServerStatePayload

type Db = import('drizzle-orm/postgres-js').PostgresJsDatabase<{ userState: typeof userState }>

async function getUserId(): Promise<string | null> {
  try {
    const { verifyToken } = await import('@clerk/backend')
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
      ['/home', { type: 'directory' }],
      ['/home/user', { type: 'directory' }],
      ['/home/user/projects', { type: 'directory' }],
      ['/etc', { type: 'directory' }],
      ['/home/user/wwwroot', { type: 'directory' }],
      ['/home/user/wwwroot/example', { type: 'directory' }],
      ['/home/user/welcome.txt', { type: 'file', content: 'Welcome to the Terminal Simulator!\n\nType `help` to see available commands.\n' }],
      ['/home/user/projects/README.md', { type: 'file', content: '# Project: Neural Link\n\nA neural interface for direct brain-computer communication.\n' }],
      ['/WELCOME_OUTPUT', { type: 'file', content: 'Terminal Simulator v1.0.0\nType `help` to see available commands.\n' }],
      ['/home/user/wwwroot/example/index.html', { type: 'file', content: '<h1>Hello, World!</h1>\n<p>Welcome to my first page on the virtual terminal.</p>\n<p>This page is served from <code>~/wwwroot/example/</code>.</p>\n' }],
      ['/home/user/wwwroot/example/style.css', { type: 'file', content: 'body {\n  font-family: system-ui, -apple-system, sans-serif;\n  max-width: 640px;\n  margin: 4rem auto;\n  padding: 0 1rem;\n  background: #faf9f6;\n  color: #1a1a1a;\n  line-height: 1.6;\n}\nh1 { color: #2563eb; }\ncode { background: #e8e8e8; padding: 0.15rem 0.4rem; border-radius: 4px; }\n' }],
    ],
    currentPath: '/home/user',
    theme: 'cyberpunk',
    envVars: {},
  }
}

export const Route = createFileRoute('/api/state')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const userId = await getUserId()
          if (!userId) {
            return new Response(JSON.stringify(null), {
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const rows = await withDb(async (db) => {
            return await db.select().from(userState).where(eq(userState.userId, userId))
          })

          if (rows.length === 0) {
            const defaultData = createDefaultServerState()
            await withDb(async (db) => {
              await db.insert(userState).values({
                userId,
                data: defaultData,
                updatedAt: new Date(),
              })
            })
            return new Response(JSON.stringify(defaultData), {
              headers: { 'Content-Type': 'application/json' },
            })
          }

          return new Response(JSON.stringify(rows[0].data), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch {
          return new Response(JSON.stringify(null), {
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
      POST: async ({ request }) => {
        try {
          const { data } = await request.json() as { data: unknown }
          if (!isValidPayload(data)) {
            return new Response(JSON.stringify({ ok: false }), {
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const userId = await getUserId()
          if (!userId) {
            return new Response(JSON.stringify({ ok: false }), {
              headers: { 'Content-Type': 'application/json' },
            })
          }

          await withDb(async (db) => {
            await db.insert(userState).values({
              userId,
              data,
              updatedAt: new Date(),
            }).onConflictDoUpdate({
              target: userState.userId,
              set: { data, updatedAt: new Date() },
            })
          })

          return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch {
          return new Response(JSON.stringify({ ok: false }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
