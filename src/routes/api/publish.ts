import { createFileRoute } from '@tanstack/react-router'
import { getCookie } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import { staticPages } from '../../lib/db/schema'

type Db = import('drizzle-orm/postgres-js').PostgresJsDatabase<{ staticPages: typeof staticPages }>

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
  const db = drizzle(client, { schema: { staticPages } })
  try {
    return await fn(db)
  } finally {
    await client.end()
  }
}

export const Route = createFileRoute('/api/publish')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const userId = await getUserId()
          if (!userId) {
            return new Response(JSON.stringify({ error: 'Authentication required' }), {
              status: 401,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const { pageName } = await request.json() as { pageName: string }
          if (!pageName || pageName.includes('..') || pageName.includes('/') || pageName.includes('\0')) {
            return new Response(JSON.stringify({ error: 'Invalid page name' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const result = await withDb(async (db) => {
            const existing = await db.select().from(staticPages).where(eq(staticPages.pageName, pageName))

            if (existing.length > 0) {
              const record = existing[0]
              if (record.ownerUserId !== userId) {
                return { error: 'Page name already taken' }
              }
              return { ok: true }
            }

            await db.insert(staticPages).values({
              pageName,
              ownerUserId: userId,
              createdAt: new Date(),
            })

            return { ok: true }
          })

          return new Response(JSON.stringify(result), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (e) {
          console.error('[publish] error:', e)
          return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
