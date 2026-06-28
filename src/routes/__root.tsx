import type { ReactNode } from 'react'
import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/clerk-react'
import '../styles/terminal.css'

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const hasClerkKey = clerkPubKey && clerkPubKey !== 'pk_test_YOUR_PUBLISHABLE_KEY_HERE'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Cyberpunk Terminal Simulator' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=VT323&display=swap' },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => <p>Route not found</p>,
})

function RootComponent() {
  return (
    <RootDocument>
      {hasClerkKey ? (
        <ClerkProvider publishableKey={clerkPubKey}>
          <Outlet />
        </ClerkProvider>
      ) : (
        <Outlet />
      )}
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-black text-terminal-green">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
