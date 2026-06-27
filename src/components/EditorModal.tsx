// src/components/EditorModal.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useTerminalStore } from '../lib/terminalStore'

export function EditorModal() {
  const editorFilePath = useTerminalStore((state) => state.editorFilePath)
  const editorContent = useTerminalStore((state) => state.editorContent)
  const saveEditor = useTerminalStore((state) => state.saveEditor)
  const closeEditor = useTerminalStore((state) => state.closeEditor)

  const [content, setContent] = useState(editorContent || '')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setContent(editorContent || '')
    const timer = setTimeout(() => {
      textareaRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [editorContent])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 's' && e.ctrlKey) {
        e.preventDefault()
        saveEditor(content)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        closeEditor()
      }
    },
    [content, saveEditor, closeEditor]
  )

  if (!editorFilePath) return null

  const fileName = editorFilePath.split('/').pop() || editorFilePath

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={() => closeEditor()}
    >
      <div
        className="flex flex-col w-[90vw] h-[85vh] max-w-4xl bg-terminal-bg border-2 rounded-lg overflow-hidden"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-terminal-green) 30%, transparent)',
          boxShadow: '0 0 30px color-mix(in srgb, var(--color-terminal-green) 15%, transparent)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b bg-terminal-bg"
          style={{ borderBottomColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
        >
          <span className="text-terminal-green font-bold terminal-glow">
            EDIT: {fileName}
          </span>
          <span className="text-terminal-green-dark text-xs font-mono">
            {editorFilePath}
          </span>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-terminal-bg text-terminal-green font-mono text-sm p-4 outline-none border-none resize-none terminal-scrollbar terminal-glow"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          style={{ caretColor: 'var(--color-terminal-green)', lineHeight: '1.6' }}
        />

        {/* Footer with shortcuts */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t bg-terminal-bg text-terminal-green-dark text-xs font-mono"
          style={{ borderTopColor: 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)' }}
        >
          <span>
            <span className="text-terminal-green font-bold">[Ctrl+S]</span> Save & Quit
          </span>
          <span>
            <span className="text-terminal-green font-bold">[Esc]</span> Quit without saving
          </span>
        </div>
      </div>
    </div>
  )
}
