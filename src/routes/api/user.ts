import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/user')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { verifyToken, createClerkClient } = await import('@clerk/backend')
          const { getCookie } = await import('@tanstack/react-start/server')

          const sessionToken = getCookie('__session')
          if (!sessionToken) {
            return new Response(JSON.stringify(null), {
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const payload = await verifyToken(sessionToken, {
            secretKey: process.env.CLERK_SECRET_KEY!,
          })
          const userId = payload.sub as string
          const user = await createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! }).users.getUser(userId)
          const username = user.username || user.firstName || user.emailAddresses[0]?.emailAddress || 'user'
          return new Response(JSON.stringify({ id: userId, username }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch {
          return new Response(JSON.stringify(null), {
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
