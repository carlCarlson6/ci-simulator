import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { executeProxyRequest } from './proxy.server'

const proxySchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']).optional().default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
})

export const proxyHttpRequest = createServerFn({ method: 'POST' })
  .validator(proxySchema)
  .handler(async ({ data }) => {
    try {
      const result = await executeProxyRequest(data.url, data.method, data.headers, data.body)
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
