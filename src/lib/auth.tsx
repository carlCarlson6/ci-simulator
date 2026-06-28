// src/lib/auth.ts
import { useClerk, useUser } from '@clerk/clerk-react'
import { useEffect, useRef } from 'react'
import { useTerminalStore } from './terminalStore'
import { loadStateFromServer } from './serverStorage'

const MAX_USERNAME_LENGTH = 12

export const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
export const hasClerkKey = clerkPubKey && clerkPubKey !== 'pk_test_YOUR_PUBLISHABLE_KEY_HERE'

export function getPromptPrefix(user?: string | null): string {
  if (!user) return 'user'
  if (user.length > MAX_USERNAME_LENGTH) {
    return user.slice(0, MAX_USERNAME_LENGTH - 1) + '\u2026'
  }
  return user
}

export function useAuthSync() {
  const { isSignedIn, user, isLoaded } = useUser()
  const clerk = useClerk()
  const setUser = useTerminalStore((state) => state.setUser)
  const setUserInfo = useTerminalStore((state) => state.setUserInfo)
  const setAuthCallbacks = useTerminalStore((state) => state.setAuthCallbacks)
  const wasSignedIn = useRef<boolean | null>(null)

  useEffect(() => {
    if (isSignedIn && user) {
      const username = user.username || user.firstName || user.emailAddresses[0]?.emailAddress || 'user'
      setUser(username)
      setUserInfo({
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || '',
        username: username,
      })

      if (wasSignedIn.current === false) {
        loadStateFromServer().then((data) => {
          if (data) {
            useTerminalStore.getState().restoreServerState(data)
          }
        })
      }

      wasSignedIn.current = true
    } else if (isLoaded) {
      setUser(null)
      setUserInfo(null)
      wasSignedIn.current = false
    }
  }, [isSignedIn, isLoaded, user, setUser, setUserInfo])

  useEffect(() => {
    setAuthCallbacks({
      openSignIn: () => clerk.openSignIn(),
      signOut: () => clerk.signOut(),
    })
  }, [clerk, setAuthCallbacks])
}

export function AuthSyncGate() {
  if (!hasClerkKey) return null
  return <AuthSyncInner />
}

function AuthSyncInner() {
  useAuthSync()
  return null
}

export function openClerkSignIn(): string | null {
  if (!hasClerkKey) {
    return 'Authentication is not configured. Set VITE_CLERK_PUBLISHABLE_KEY in .env.local'
  }
  const { openSignIn } = useTerminalStore.getState().authCallbacks
  if (!openSignIn) {
    return 'Authentication system is still initializing. Please try again.'
  }
  openSignIn()
  return null
}

export function clerkSignOut(): string | null {
  if (!hasClerkKey) {
    return 'Authentication is not configured.'
  }
  const { signOut } = useTerminalStore.getState().authCallbacks
  if (!signOut) {
    return 'Authentication system is still initializing. Please try again.'
  }
  signOut()
  return null
}
