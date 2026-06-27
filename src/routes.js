import { jsx as _jsx } from "react/jsx-runtime";
import { createRootRoute, createRoute, Outlet } from '@tanstack/react-router';
import { Terminal } from './components/Terminal';
const rootRoute = createRootRoute({
    component: () => (_jsx("div", { className: "h-screen w-screen bg-terminal-bg overflow-hidden", children: _jsx("div", { className: "h-full w-full", children: _jsx(Outlet, {}) }) })),
});
const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => _jsx(Terminal, {}),
});
export const routeTree = rootRoute.addChildren([indexRoute]);
