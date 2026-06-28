import { createServerFn } from '@tanstack/react-start'

export const getServerUserFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    try {
      const { verifyToken, createClerkClient } = await import('@clerk/backend')
      const { getCookie } = await import('@tanstack/react-start/server')

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
