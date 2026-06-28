import { useState, useEffect, useRef, useCallback } from 'react'

type BootPhase = {
  text: string
  duration: number
}

const BOOT_PHASES: BootPhase[] = [
  { text: 'CI-OS BIOS v1.0.0 (build 2026)', duration: 500 },
  { text: 'Memory Test: 8192M OK', duration: 800 },
  { text: 'Loading kernel...', duration: 500 },
  { text: '[  OK  ] Mounted /proc\n[  OK  ] Mounted /dev\n[  OK  ] Started network service', duration: 1500 },
]

export function BootSequence({ onComplete }: { onComplete: () => void }) {
  const [visibleLines, setVisibleLines] = useState<string[]>([])
  const [currentPhase, setCurrentPhase] = useState(0)
  const [currentChar, setCurrentChar] = useState(0)
  const [showLogin, setShowLogin] = useState(false)
  const [loginInput, setLoginInput] = useState('')
  const skipped = useRef(false)

  useEffect(() => {
    if (currentPhase >= BOOT_PHASES.length) {
      const timer = setTimeout(() => setShowLogin(true), 300)
      return () => clearTimeout(timer)
    }

    const phase = BOOT_PHASES[currentPhase]
    const text = phase.text
    const chars = text.split('')

    if (currentChar >= chars.length) {
      const timer = setTimeout(() => {
        setCurrentPhase((p) => p + 1)
        setCurrentChar(0)
      }, phase.duration)
      return () => clearTimeout(timer)
    }

    const typeTimer = setTimeout(() => {
      const nextChar = currentChar + 1
      const currentText = chars.slice(0, nextChar).join('')
      const lines = currentText.split('\n')

      let fullLines: string[]
      if (lines.length > 1) {
        fullLines = [...visibleLines.slice(0, visibleLines.length - 1 || 0), ...lines]
      } else {
        fullLines = [...BOOT_PHASES.slice(0, currentPhase).map((p) => p.text.split('\n')).flat(), currentText]
      }

      setVisibleLines(fullLines)
      setCurrentChar(nextChar)
    }, 15)

    return () => clearTimeout(typeTimer)
  }, [currentPhase, currentChar, visibleLines])

  const skip = useCallback(() => {
    if (!skipped.current) {
      skipped.current = true
      const allLines = BOOT_PHASES.map((p) => p.text.split('\n')).flat()
      setVisibleLines(allLines)
      setCurrentPhase(BOOT_PHASES.length)
      setShowLogin(true)
    }
  }, [])

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onComplete()
  }

  if (showLogin) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center font-mono">
        <div className="text-terminal-green mb-8 text-lg animate-pulse">
          CI-OS v1.0.0
        </div>
        <div className="text-terminal-green-dim mb-4">
          ci-simulator login:
        </div>
        <form onSubmit={handleLoginSubmit} className="flex items-center gap-2">
          <span className="text-terminal-green-dim">Password:</span>
          <input
            type="password"
            value={loginInput}
            onChange={(e) => setLoginInput(e.target.value)}
            className="bg-transparent border border-terminal-green-dark/50 text-terminal-green font-mono px-2 py-1 outline-none focus:border-terminal-green/50"
            autoFocus
          />
        </form>
      </div>
    )
  }

  return (
    <div
      className="h-screen w-screen bg-black flex flex-col font-mono p-8 cursor-pointer"
      onClick={skip}
      onKeyDown={(e) => { if (e.key === 'c' && e.ctrlKey) skip() }}
      tabIndex={0}
      role="button"
      aria-label="Boot sequence - click or press Ctrl+C to skip"
    >
      {visibleLines.map((line, i) => (
        <div
          key={i}
          className="text-terminal-green text-sm leading-relaxed"
        >
          {line}
        </div>
      ))}
    </div>
  )
}

export function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onLogin()
  }

  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center font-mono">
      <div className="text-terminal-green mb-8 text-lg animate-pulse">
        CI-OS v1.0.0
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <div className="text-terminal-green-dim">ci-simulator login:</div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-transparent border border-terminal-green-dark/50 text-terminal-green font-mono px-3 py-1.5 outline-none focus:border-terminal-green/50 w-64 text-center"
          placeholder="Press Enter to login"
          autoFocus
        />
      </form>
    </div>
  )
}
