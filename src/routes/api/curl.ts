import { createFileRoute } from '@tanstack/react-router'
import { executeHttpRequest } from '../../lib/curlServer'

export const Route = createFileRoute('/api/curl')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.json() as Record<string, unknown>
        const data = payload.data as Record<string, unknown> | undefined

        if (!data || typeof data.url !== 'string') {
          return new Response(JSON.stringify({ error: 'Invalid request' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        try {
          const result = await executeHttpRequest(
            data.url,
            (data.method as string) || 'GET',
            data.headers as Record<string, string> | undefined,
            data.body as string | undefined,
          )
          return new Response(JSON.stringify({
            status: result.status,
            statusText: result.statusText,
            headers: result.headers,
            body: result.body,
          }), {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (err) {
          return new Response(JSON.stringify({ error: (err as Error).message }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }
      },
    },
  },
})
