import { create } from 'zustand'

export type WindowApp = 'terminal' | 'files' | 'editor' | 'settings'

export type WindowState = {
  id: number
  app: WindowApp
  title: string
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  focused: boolean
  zIndex: number
}

type DesktopState = {
  windows: WindowState[]
  nextWindowId: number
  nextZIndex: number
  wallpaper: string

  openWindow: (app: WindowApp, title: string) => number
  closeWindow: (id: number) => void
  minimizeWindow: (id: number) => void
  restoreWindow: (id: number) => void
  focusWindow: (id: number) => void
  moveWindow: (id: number, x: number, y: number) => void
  resizeWindow: (id: number, width: number, height: number) => void
}

export const useDesktopStore = create<DesktopState>((set, get) => ({
  windows: [],
  nextWindowId: 1,
  nextZIndex: 1,
  wallpaper: 'matrix',

  openWindow: (app, title) => {
    const state = get()
    const id = state.nextWindowId
    const zIndex = state.nextZIndex
    const offset = (state.windows.length % 10) * 30
    set({
      nextWindowId: id + 1,
      nextZIndex: zIndex + 1,
      windows: [
        ...state.windows.map((w) => ({ ...w, focused: false })),
        {
          id,
          app,
          title,
          x: 100 + offset,
          y: 80 + offset,
          width: 700,
          height: 450,
          minimized: false,
          focused: true,
          zIndex,
        },
      ],
    })
    return id
  },

  closeWindow: (id) => {
    set((state) => ({
      windows: state.windows.filter((w) => w.id !== id),
    }))
  },

  minimizeWindow: (id) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, minimized: true, focused: false } : w
      ),
    }))
  },

  restoreWindow: (id) => {
    const state = get()
    set({
      nextZIndex: state.nextZIndex + 1,
      windows: state.windows.map((w) =>
        w.id === id
          ? { ...w, minimized: false, focused: true, zIndex: state.nextZIndex }
          : { ...w, focused: false }
      ),
    })
  },

  focusWindow: (id) => {
    const state = get()
    const win = state.windows.find((w) => w.id === id)
    if (!win || win.focused) return
    set({
      nextZIndex: state.nextZIndex + 1,
      windows: state.windows.map((w) =>
        w.id === id
          ? { ...w, focused: true, zIndex: state.nextZIndex }
          : { ...w, focused: false }
      ),
    })
  },

  moveWindow: (id, x, y) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, x, y } : w
      ),
    }))
  },

  resizeWindow: (id, width, height) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? { ...w, width, height } : w
      ),
    }))
  },
}))
