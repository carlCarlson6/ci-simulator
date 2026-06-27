# Implementation Plan: Clerk Authentication for Terminal Simulator

This document details the step-by-step implementation of Clerk authentication in the terminal simulator. Authentication is scoped to the terminal prompt only — no command gating, no global UI changes.

**Status:** 📝 PLANNED
**Dependencies:** P006 TanStack Start Migration (for full `createServerFn` integration; this plan works in Vite SPA mode with `@clerk/clerk-react`)
**Architecture Principle:** ALL authentication code lives in `src/lib/auth.ts`. No auth logic in components or command files.

---

## Phase 1: Install Clerk & Configure Environment

**Goal:** Add `@clerk/clerk-react` and set up the publishable key.

**Files to modify:**
- `package.json` — add dependency `@clerk/clerk-react`
- `.env.local` — add `VITE_CLERK_PUBLISHABLE_KEY`
- `.gitignore` — ensure `.env.local` is ignored

**Notes:**
- Uses `@clerk/clerk-react` (SPA mode) even though TanStack Start migration is in progress. Clerk React works in both Vite SPA and TanStack Start.
- The publishable key is safe to expose in client-side code (it's not a secret).
- `.env.local` is the standard Vite location for local environment variables.

**Deliverable:** `npm install` succeeds, `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY` is available at runtime.

---

## Phase 2: Create Centralized Auth Module

**Goal:** Create `src/lib/auth.ts` as the single source of truth for ALL authentication logic.

**File to create:** `src/lib/auth.ts`

**Exports:**

| Export | Type | Responsibility |
|--------|------|----------------|
| `useAuthSync()` | Hook | Watches Clerk auth state, syncs `user.username` to `terminalStore.user`, sets `openSignIn`/`signOut` callbacks in store |
| `openClerkSignIn()` | Function | Opens Clerk `<SignIn />` modal via `useClerk().openSignIn()` |
| `clerkSignOut()` | Function | Signs out via `useClerk().signOut()` |
| `getPromptPrefix(user?)` | Function | Returns truncated username (max 12 chars) or `'user'` for anonymous |

**Implementation details:**

```typescript
// src/lib/auth.ts
import { useClerk, useUser } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { useTerminalStore } from './terminalStore'

const MAX_USERNAME_LENGTH = 12

export function getPromptPrefix(user?: string | null): string {
  if (!user) return 'user'
  if (user.length > MAX_USERNAME_LENGTH) {
    return user.slice(0, MAX_USERNAME_LENGTH - 1) + '\u2026' // ellipsis
  }
  return user
}

export function useAuthSync() {
  const { isSignedIn, user } = useUser()
  const clerk = useClerk()
  const setUser = useTerminalStore((state) => state.setUser)
  const setAuthCallbacks = useTerminalStore((state) => state.setAuthCallbacks)

  useEffect(() => {
    if (isSignedIn && user) {
      setUser(user.username || user.firstName || user.emailAddresses[0]?.emailAddress || 'user')
    } else {
      setUser(null)
    }
  }, [isSignedIn, user, setUser])

  useEffect(() => {
    setAuthCallbacks({
      openSignIn: () => clerk.openSignIn(),
      signOut: () => clerk.signOut(),
    })
  }, [clerk, setAuthCallbacks])
}

export function openClerkSignIn() {
  // Commands call this via terminalStore auth callbacks
  // The actual implementation is injected by useAuthSync
  const { openSignIn } = useTerminalStore.getState().authCallbacks
  if (openSignIn) {
    openSignIn()
  }
}

export function clerkSignOut() {
  const { signOut } = useTerminalStore.getState().authCallbacks
  if (signOut) {
    signOut()
  }
}
```

**Notes:**
- `useAuthSync` must be called inside `<ClerkProvider>` (i.e., inside `Terminal.tsx` or `main.tsx`).
- Fallback chain for username: `username` → `firstName` → `primaryEmail` → `'user'`.
- Truncation uses Unicode ellipsis (`\u2026`) to save character space.

**Deliverable:** `src/lib/auth.ts` compiles, exports are typed correctly.

---

## Phase 3: Extend Terminal Store with User State

**Goal:** Add `user` state and auth callback storage to `terminalStore.ts`.

**File to modify:** `src/lib/terminalStore.ts`

**Changes:**

1. Add to `TerminalState` type:
```typescript
type AuthCallbacks = {
  openSignIn?: () => void
  signOut?: () => void
}

type TerminalState = {
  // ...existing fields...
  user: string | null
  authCallbacks: AuthCallbacks
  setUser: (user: string | null) => void
  setAuthCallbacks: (callbacks: AuthCallbacks) => void
}
```

2. Modify `getPrompt()`:
```typescript
getPrompt: () => {
  const path = get().currentPath === '/home/user' ? '~' : get().currentPath
  const prefix = getPromptPrefix(get().user)
  return `${prefix}:${path}`
}
```

**Notes:**
- `user` is stored as a plain string, not a Clerk User object. This keeps the store serializable and free of external dependencies.
- `authCallbacks` are stored as a ref-like object (not persisted, just a holder for functions).

**Deliverable:** `getPrompt()` returns `user:~` when anonymous, `<username>:~` when authenticated.

---

## Phase 4: Update Command Context & Registry

**Goal:** Pass `user` to command handlers so they can implement auth-aware behavior.

**Files to modify:**
- `src/lib/commands/types.ts` — add `user?: string` to `CommandContext`
- `src/lib/commands/index.ts` — inject `user` from terminal store into `CommandContext`

**Changes in `types.ts`:**
```typescript
export type CommandContext = {
  fileSystem: FileSystem
  currentPath: string
  previousPath: string
  history: string[]
  user?: string | null  // NEW
}
```

**Changes in `commands/index.ts`:**
```typescript
export function executeCommand(input: string, context: CommandContext): CommandResult {
  // ...existing code...
}

// In terminalStore.ts executeCommand:
const result = executeCommand(trimmed, {
  fileSystem: state.fileSystem,
  currentPath: state.currentPath,
  previousPath: state.previousPath,
  history: state.history,
  user: state.user,  // NEW
})
```

**Deliverable:** All command handlers receive `user` in context.

---

## Phase 5: Implement `login`, `logout`, and `whoami` Commands

**Goal:** Add three new commands that interact with Clerk via the auth module.

**Files to create:**
- `src/lib/commands/login.ts`
- `src/lib/commands/logout.ts`
- `src/lib/commands/whoami.ts`

**File to modify:**
- `src/lib/commands/index.ts` — register new commands
- `src/lib/commands/help.ts` — add new commands to help text

### `login.ts`

```typescript
import { CommandHandler } from './types'
import { openClerkSignIn } from '../auth'

export const MANUAL = 'login\n\nOpen Clerk authentication modal.\n\nUsage: login'
export const HELP_TEXT = '  login                 Open authentication modal'

export const handler: CommandHandler = () => {
  openClerkSignIn()
  return { success: true, data: { output: 'Opening authentication...' } }
}
```

### `logout.ts`

```typescript
import { CommandHandler } from './types'
import { clerkSignOut } from '../auth'

export const MANUAL = 'logout\n\nSign out from Clerk.\n\nUsage: logout'
export const HELP_TEXT = '  logout                Sign out'

export const handler: CommandHandler = (_args, context) => {
  if (!context.user) {
    return { success: false, error: 'Not logged in' }
  }
  clerkSignOut()
  return { success: true, data: { output: 'Signed out successfully.' } }
}
```

### `whoami.ts`

```typescript
import { CommandHandler } from './types'

export const MANUAL = 'whoami\n\nDisplay current user.\n\nUsage: whoami'
export const HELP_TEXT = '  whoami                Display current user'

export const handler: CommandHandler = (_args, context) => {
  const name = context.user || 'anonymous'
  return { success: true, data: { output: name } }
}
```

**Notes:**
- `login` always opens the Clerk modal, even if already signed in (Clerk handles this gracefully).
- `logout` fails with message `"Not logged in"` when anonymous.
- `whoami` returns `"anonymous"` when not authenticated.

**Deliverable:** `login`, `logout`, and `whoami` are available in tab completion and `help` output.

---

## Phase 6: Update Prompt Rendering in UI Components

**Goal:** Make `TerminalInput.tsx` and `TerminalOutput.tsx` use `getPromptPrefix()` from the auth module instead of hardcoded `'user'`.

**Files to modify:**
- `src/components/TerminalInput.tsx`
- `src/components/TerminalOutput.tsx`

### `TerminalInput.tsx` changes:

Replace the hardcoded prompt rendering:
```tsx
// BEFORE:
<span className="text-terminal-green font-bold">user</span>
<span className="text-terminal-green-dark">:</span>
<span className="text-terminal-green-dark">{prompt.split(':')[1]}</span>

// AFTER:
{(() => {
  const prefix = prompt.split(':')[0]
  const path = prompt.split(':')[1]
  return (
    <>
      <span className="text-terminal-green font-bold">{prefix}</span>
      <span className="text-terminal-green-dark">:</span>
      <span className="text-terminal-green-dark">{path}</span>
    </>
  )
})()}
```

### `TerminalOutput.tsx` changes:

Refactor `renderPrompt()` to dynamically split on `:` instead of slicing 5 characters:
```typescript
function renderPrompt(content: string) {
  const colonIdx = content.indexOf(':')
  if (colonIdx === -1) return <span>{content}</span>
  
  const prefix = content.slice(0, colonIdx)
  const rest = content.slice(colonIdx + 1)
  const spaceIdx = rest.indexOf(' ')
  const path = spaceIdx === -1 ? rest : rest.slice(0, spaceIdx)
  const command = spaceIdx === -1 ? '' : rest.slice(spaceIdx)
  
  return (
    <span>
      <span className="text-terminal-green font-bold">{prefix}</span>
      <span className="text-terminal-green-dark">:</span>
      <span className="text-terminal-green-dark">{path}</span>
      <span>{command}</span>
    </span>
  )
}
```

Also update the prompt detection logic:
```tsx
// BEFORE:
{line.type === 'prompt' && line.content.startsWith('user:') ? (

// AFTER:
{line.type === 'prompt' && line.content.includes(':') ? (
```

**Deliverable:** Prompts render correctly for any username length, including truncated names.

---

## Phase 7: Wrap App with ClerkProvider

**Goal:** Add `<ClerkProvider>` at the root of the app.

**File to modify:** `src/main.tsx`

**Changes:**
```typescript
import { ClerkProvider } from '@clerk/clerk-react'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// ...

<ClerkProvider publishableKey={clerkPubKey}>
  <RouterProvider router={router} />
</ClerkProvider>
```

**Notes:**
- No `AuthSync` component in `main.tsx` — auth sync is called from `Terminal.tsx` to keep auth logic scoped.
- `ClerkProvider` is app-wide because it needs to wrap any route that might use auth.

**Deliverable:** App boots without Clerk errors, `window.Clerk` is available in dev tools.

---

## Phase 8: Integrate Auth Sync in Terminal Component

**Goal:** Call `useAuthSync()` inside `Terminal.tsx` so auth state is synchronized when the terminal mounts.

**File to modify:** `src/components/Terminal.tsx`

**Changes:**
```typescript
import { useAuthSync } from '../lib/auth'

export function Terminal() {
  useAuthSync() // NEW: syncs Clerk state to terminal store
  
  const initialize = useTerminalStore((state) => state.initialize)
  // ... rest of component
}
```

**Deliverable:** When a user signs in via Clerk modal, the terminal prompt updates in real time without a page refresh.

---

## Phase 9: Testing & Edge Cases

**Goal:** Verify all auth flows work correctly.

**Test scenarios:**

| Scenario | Expected Behavior |
|----------|-------------------|
| Load app (no prior auth) | Prompt shows `user:~`, `whoami` returns `anonymous` |
| Run `login` | Clerk modal opens, output shows `Opening authentication...` |
| Sign in via Clerk modal | Modal closes, prompt updates to `<username>:~` |
| Run `whoami` after login | Returns truncated username (max 12 chars) |
| Run `logout` | Signs out, prompt reverts to `user:~` |
| Run `logout` when anonymous | Error: `Not logged in` |
| Long username (>12 chars) | Prompt shows truncated name with ellipsis |
| Command history after login | Previous commands still work, path is preserved |
| Page refresh while logged in | Clerk restores session, prompt shows username |

**Edge cases to handle:**
- Clerk initialization delay — `useAuthSync` should handle `isLoaded === false` gracefully.
- Network errors during sign-in — Clerk handles internally; no custom handling needed.
- User with no username, firstName, or email — fallback to `'user'`.

**Deliverable:** All scenarios pass in manual testing. Automated tests out of scope for this plan.

---

## Build Checklist

- [ ] Phase 1: Install Clerk & Configure Environment
- [ ] Phase 2: Create Centralized Auth Module (`src/lib/auth.ts`)
- [ ] Phase 3: Extend Terminal Store with User State
- [ ] Phase 4: Update Command Context & Registry
- [ ] Phase 5: Implement `login`, `logout`, and `whoami` Commands
- [ ] Phase 6: Update Prompt Rendering in UI Components
- [ ] Phase 7: Wrap App with `ClerkProvider`
- [ ] Phase 8: Integrate Auth Sync in Terminal Component
- [ ] Phase 9: Testing & Edge Cases

---

## Migration Notes (P006 Compatibility)

When TanStack Start migration (P006) completes, this auth system requires minimal changes:

1. **Package swap:** Replace `@clerk/clerk-react` with `@clerk/tanstack-react-start`.
2. **Provider update:** Swap `<ClerkProvider>` for `<ClerkProvider>` from `@clerk/tanstack-react-start` (same component name, different package).
3. **Server-side auth:** Add `getAuth()` calls in server functions if any commands need server-side user context.
4. **Middleware:** Add `beforeLoad` guards if routes become auth-gated in the future.

The `src/lib/auth.ts` API surface (`useAuthSync`, `openClerkSignIn`, `clerkSignOut`, `getPromptPrefix`) remains unchanged — only the internal implementation of `useAuthSync` changes to use TanStack Start-specific Clerk hooks.

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `.env.local` | Create | Clerk publishable key |
| `package.json` | Modify | Add `@clerk/clerk-react` |
| `src/main.tsx` | Modify | Wrap with `<ClerkProvider>` |
| `src/lib/auth.ts` | **Create** | Centralized auth logic |
| `src/lib/terminalStore.ts` | Modify | Add `user` state, update `getPrompt()` |
| `src/lib/commands/types.ts` | Modify | Add `user` to `CommandContext` |
| `src/lib/commands/index.ts` | Modify | Register new commands, pass `user` to context |
| `src/lib/commands/login.ts` | **Create** | Open Clerk sign-in modal |
| `src/lib/commands/logout.ts` | **Create** | Sign out from Clerk |
| `src/lib/commands/whoami.ts` | **Create** | Display current user |
| `src/lib/commands/help.ts` | Modify | Add new commands to help text |
| `src/components/Terminal.tsx` | Modify | Call `useAuthSync()` |
| `src/components/TerminalInput.tsx` | Modify | Dynamic prompt rendering |
| `src/components/TerminalOutput.tsx` | Modify | Dynamic prompt rendering |

---

## Notes

- **No auth-gated commands** in this plan. All commands work for both anonymous and authenticated users.
- **No user data persistence** — Clerk handles session persistence via cookies.
- **Prompt history** — old prompts in scrollback retain the username that was active at the time of command entry (stored as string in `TerminalLine.content`). This is correct behavior.
- **Username truncation** — happens at render time via `getPromptPrefix()`, not at storage time. Full username is preserved in `terminalStore.user`.
