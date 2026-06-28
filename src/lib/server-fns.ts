import { createServerFn } from '@tanstack/react-start'
import { verifyToken, createClerkClient } from '@clerk/backend'
import { getCookie } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { userState } from './db/schema'
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
