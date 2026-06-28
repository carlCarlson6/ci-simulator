import { createFileRoute } from '@tanstack/react-router'
import { Terminal } from '../components/Terminal'
import { getUser, getServerState } from '../lib/server-fns'
import type { ServerStatePayload } from '../lib/serverStorage'

export const Route = createFileRoute('/')({
  loader: async (): Promise<{
    user: { id: string; username: string } | null
    serverState: ServerStatePayload | null
  }> => {
    const user = await getUser()
    if (!user) return { user: null, serverState: null }

    const serverState = await getServerState()
    return { user, serverState }
  },
  component: Terminal,
})
