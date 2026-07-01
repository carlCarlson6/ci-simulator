// src/lib/desktopStore.ts
// Zustand store for the /desktop window manager. Orthogonal to terminalStore:
// it only owns desktop UI state (open windows, geometry, z-order). File
// system, tasks, theme and auth state all stay in terminalStore, so the
// desktop and the fullscreen terminal always see the same data.
import { create } from 'zustand'

export type AppId = 'terminal' | 'files' | 'notes' | 'tasks' | 'settings'

export type AppMeta = {
  id: AppId
  title: string
  glyph: string
  width: number
  height: number
}

export const APPS: AppMeta[] = [
  { id: 'terminal', title: 'Terminal', glyph: '>_', width: 780, height: 520 },
  { id: 'files', title: 'Files', glyph: '▦', width: 680, height: 470 },
  { id: 'notes', title: 'Notes', glyph: '✎', width: 780, height: 500 },
  { id: 'tasks', title: 'Tasks', glyph: '☑', width: 780, height: 500 },
  { id: 'settings', title: 'Settings', glyph: '⚙', width: 560, height: 500 },
]

export function getAppMeta(id: AppId): AppMeta {
  return APPS.find((a) => a.id === id) ?? APPS[0]
}

export function isAppId(value: unknown): value is AppId {
  return typeof value === 'string' && APPS.some((a) => a.id === value)
}

export type WindowRect = { x: number; y: number; width: number; height: number }

export type DesktopWindow = WindowRect & {
  id: number
  appId: AppId
  minimized: boolean
  maximized: boolean
  zIndex: number
  prevRect: WindowRect | null // geometry to restore when un-maximizing
}

export const MIN_WINDOW_WIDTH = 360
export const MIN_WINDOW_HEIGHT = 240

type DesktopState = {
  windows: DesktopWindow[]
  nextWindowId: number
  nextZIndex: number

  openApp: (appId: AppId) => void
  closeWindow: (id: number) => void
  focusWindow: (id: number) => void
  minimizeWindow: (id: number) => void
  toggleMaximize: (id: number) => void
  toggleFromTaskbar: (id: number) => void
  moveWindow: (id: number, x: number, y: number) => void
  resizeWindow: (id: number, width: number, height: number) => void
}

// Highest z-index among visible windows = the focused one.
export function topWindowId(windows: DesktopWindow[]): number | null {
  let top: DesktopWindow | null = null
  for (const w of windows) {
    if (w.minimized) continue
    if (!top || w.zIndex > top.zIndex) top = w
  }
  return top?.id ?? null
}

export const useDesktopStore = create<DesktopState>((set, get) => ({
  windows: [],
  nextWindowId: 1,
  nextZIndex: 1,

  // Apps are single-instance: reopening focuses (and restores) the window.
  openApp: (appId) => {
    const st = get()
    const existing = st.windows.find((w) => w.appId === appId)
    if (existing) {
      set({
        windows: st.windows.map((w) =>
          w.id === existing.id ? { ...w, minimized: false, zIndex: st.nextZIndex } : w
        ),
        nextZIndex: st.nextZIndex + 1,
      })
      return
    }

    const meta = getAppMeta(appId)
    const offset = ((st.nextWindowId - 1) % 6) * 28
    const win: DesktopWindow = {
      id: st.nextWindowId,
      appId,
      x: 120 + offset,
      y: 40 + offset,
      width: meta.width,
      height: meta.height,
      minimized: false,
      maximized: false,
      zIndex: st.nextZIndex,
      prevRect: null,
    }
    set({
      windows: [...st.windows, win],
      nextWindowId: st.nextWindowId + 1,
      nextZIndex: st.nextZIndex + 1,
    })
  },

  closeWindow: (id) => {
    set((st) => ({ windows: st.windows.filter((w) => w.id !== id) }))
  },

  focusWindow: (id) => {
    const st = get()
    const win = st.windows.find((w) => w.id === id)
    if (!win || win.zIndex === st.nextZIndex - 1) return
    set({
      windows: st.windows.map((w) => (w.id === id ? { ...w, zIndex: st.nextZIndex } : w)),
      nextZIndex: st.nextZIndex + 1,
    })
  },

  minimizeWindow: (id) => {
    set((st) => ({
      windows: st.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
    }))
  },

  toggleMaximize: (id) => {
    const st = get()
    set({
      windows: st.windows.map((w) => {
        if (w.id !== id) return w
        if (w.maximized) {
          const rect = w.prevRect ?? { x: 120, y: 40, width: w.width, height: w.height }
          return { ...w, ...rect, maximized: false, prevRect: null, zIndex: st.nextZIndex }
        }
        return {
          ...w,
          maximized: true,
          prevRect: { x: w.x, y: w.y, width: w.width, height: w.height },
          zIndex: st.nextZIndex,
        }
      }),
      nextZIndex: st.nextZIndex + 1,
    })
  },

  // Taskbar button: restore if minimized, minimize if focused, focus otherwise.
  toggleFromTaskbar: (id) => {
    const st = get()
    const win = st.windows.find((w) => w.id === id)
    if (!win) return
    if (!win.minimized && topWindowId(st.windows) === id) {
      get().minimizeWindow(id)
    } else {
      set({
        windows: st.windows.map((w) =>
          w.id === id ? { ...w, minimized: false, zIndex: st.nextZIndex } : w
        ),
        nextZIndex: st.nextZIndex + 1,
      })
    }
  },

  moveWindow: (id, x, y) => {
    set((st) => ({
      windows: st.windows.map((w) => (w.id === id ? { ...w, x, y } : w)),
    }))
  },

  resizeWindow: (id, width, height) => {
    set((st) => ({
      windows: st.windows.map((w) =>
        w.id === id
          ? {
              ...w,
              width: Math.max(MIN_WINDOW_WIDTH, width),
              height: Math.max(MIN_WINDOW_HEIGHT, height),
            }
          : w
      ),
    }))
  },
}))
