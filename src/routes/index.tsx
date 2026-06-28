import { createFileRoute } from '@tanstack/react-router'
import { Terminal } from '../components/Terminal'
import type { ServerStatePayload } from '../lib/serverStorage'

export const Route = createFileRoute('/')({
  loader: async (): Promise<{
    user: { id: string; username: string } | null
    serverState: ServerStatePayload | null
  }> => {
    const userRes = await fetch('/api/user')
    const user = await userRes.json() as { id: string; username: string } | null

    if (!user) return { user: null, serverState: null }

    try {
      const stateRes = await fetch('/api/state')
      const serverState = await stateRes.json() as ServerStatePayload | null
      return { user, serverState }
    } catch {
      return { user, serverState: null }
    }
  },
  component: Terminal,
})
