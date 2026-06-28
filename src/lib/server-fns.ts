import { createServerFn } from '@tanstack/react-start'
import { verifyToken, createClerkClient } from '@clerk/backend'
import { getCookie } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { userState, staticPages } from './db/schema'
import type { ServerStatePayload } from './db/schema'

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

export const getServerState = createServerFn({ method: 'GET' }).handler(async () => {
  console.info("GET [getServerState]")
  try {
    const sessionToken = getCookie('__session')
    if (!sessionToken) return null

    const payload = await verifyToken(sessionToken, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    })
    const userId = payload.sub as string

    const client = postgres(process.env.DATABASE_URL!)
    const db = drizzle(client, { schema: { userState } })

    try {
      const rows = await db.select().from(userState).where(eq(userState.userId, userId))
      if (rows.length > 0) return rows[0].data as ServerStatePayload
      return null
    } finally {
      await client.end()
    }
  } catch(e) {
    console.error("[getServerState] - there was an erro:\n", e);
    return null;
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
