import { createFileRoute } from '@tanstack/react-router'
import { Desktop } from '../components/desktop/Desktop'
import { getUser, loadServerState } from '../lib/server-fns'
import type { ServerStatePayload } from '../lib/serverStorage'

export const Route = createFileRoute('/desktop')({
  validateSearch: (search: Record<string, unknown>): { app?: string } => ({
    app: typeof search.app === 'string' ? search.app : undefined,
  }),
  loader: async (): Promise<{
    user: { id: string; username: string } | null
    serverState: ServerStatePayload | null
  }> => {
    const user = await getUser()
    if (!user) return { user: null, serverState: null }

    const serverState = await loadServerState()
    return { user, serverState }
  },
  head: () => ({
    meta: [{ title: 'CI-OS Desktop' }],
  }),
  component: Desktop,
})
