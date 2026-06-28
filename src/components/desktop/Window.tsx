import { useRef, useCallback } from 'react'

type WindowProps = {
  id: number
  title: string
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  focused: boolean
  zIndex: number
  onClose: () => void
  onMinimize: () => void
  onFocus: () => void
  onMove: (x: number, y: number) => void
  onResize: (w: number, h: number) => void
  children: React.ReactNode
}

export function Window({
  id, title, x, y, width, height, minimized, focused, zIndex,
  onClose, onMinimize, onFocus, onMove, onResize, children,
}: WindowProps) {
  const dragRef = useRef<{ startX: number; startY: number; startW: number; startH: number; origX: number; origY: number } | null>(null)

  const handleTitleMouseDown = useCallback((e: React.MouseEvent) => {
    onFocus()
    const rect = e.currentTarget.parentElement?.getBoundingClientRect()
    if (!rect) return
    dragRef.current = {
      startX: e.clientX - rect.left,
      startY: e.clientY - rect.top,
      startW: width,
      startH: height,
      origX: x,
      origY: y,
    }
    const onMouseMove = (me: MouseEvent) => {
      if (!dragRef.current) return
      onMove(me.clientX - dragRef.current.startX, me.clientY - dragRef.current.startY)
    }
    const onMouseUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [onFocus, onMove, x, y, width, height])

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const onMouseMove = (me: MouseEvent) => {
      onResize(Math.max(300, width + me.clientX - startX), Math.max(150, height + me.clientY - startY))
    }
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [onResize, width, height])

  if (minimized) return null

  return (
    <div
      onMouseDown={onFocus}
      className="absolute border border-terminal-green-dark/60 rounded-lg overflow-hidden shadow-[0_0_15px_rgba(0,255,0,0.1)] flex flex-col"
      style={{
        left: x,
        top: y,
        width,
        height,
        zIndex,
        backgroundColor: 'rgba(0,0,0,0.92)',
        display: minimized ? 'none' : 'flex',
      }}
      role="dialog"
      aria-label={title}
      aria-hidden={minimized}
    >
      <div
        className="h-9 bg-terminal-green-dark/20 flex items-center justify-between px-3 shrink-0 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleTitleMouseDown}
        role="toolbar"
        aria-label="Window title bar"
      >
        <span className="text-terminal-green-dim text-xs font-mono truncate">{title}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize() }}
            className="w-3.5 h-3.5 border border-terminal-yellow/60 rounded flex items-center justify-center hover:bg-terminal-yellow/20 transition-colors"
            aria-label="Minimize"
          >
            <span className="text-terminal-yellow text-[8px] leading-none">_</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            className="w-3.5 h-3.5 border border-terminal-red/60 rounded flex items-center justify-center hover:bg-terminal-red/20 transition-colors"
            aria-label="Close"
          >
            <span className="text-terminal-red text-[8px] leading-none">&#x2715;</span>
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  )
}
