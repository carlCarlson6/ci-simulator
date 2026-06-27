import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { Terminal } from './components/Terminal'

const rootRoute = createRootRoute({
  component: () => (
    <div className="h-screen w-screen bg-terminal-bg overflow-hidden">
      <div className="h-full w-full">
        <Outlet />
      </div>
    </div>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Terminal />,
})

export const routeTree = rootRoute.addChildren([indexRoute])
