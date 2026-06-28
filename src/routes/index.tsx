import { createFileRoute } from '@tanstack/react-router'
import { Terminal } from '../components/Terminal'

export const Route = createFileRoute('/')({
  loader: async (): Promise<{ id: string; username: string } | null> => {
    const { getServerUserFn } = await import('../lib/serverUser')
    return getServerUserFn()
  },
  component: Terminal,
})
