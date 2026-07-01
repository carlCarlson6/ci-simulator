// src/components/desktop/apps/SettingsApp.tsx
// GUI for what `theme`, `sound`, `login`/`logout` do in the terminal.
import { useState } from 'react'
import { useTerminalStore } from '../../../lib/terminalStore'
import { themes } from '../../../lib/themes'
import { soundEngine } from '../../../lib/soundEngine'
import { persistState, syncToServerIfUser } from '../../../lib/sync'
import { hasClerkKey } from '../../../lib/auth'

export function SettingsApp() {
  const currentTheme = useTerminalStore((s) => s.currentTheme)
  const user = useTerminalStore((s) => s.user)
  const userInfo = useTerminalStore((s) => s.userInfo)
  const authCallbacks = useTerminalStore((s) => s.authCallbacks)

  const [sound, setSound] = useState(() => ({
    enabled: soundEngine.getEnabled(),
    volume: soundEngine.getVolume(),
  }))

  function applyTheme(name: string) {
    const st = useTerminalStore.getState()
    st.setTheme(name)
    persistState(st.fileSystem, st.currentPath, name, st.envVars)
    syncToServerIfUser(st.user).catch(() => {})
  }

  function updateSound(next: { enabled: boolean; volume: number }) {
    soundEngine.setEnabled(next.enabled)
    soundEngine.setVolume(next.volume)
    localStorage.setItem('ci-simulator-sound', JSON.stringify(next))
    setSound(next)
    if (next.enabled) soundEngine.play('command')
  }

  const border = 'color-mix(in srgb, var(--color-terminal-green) 20%, transparent)'

  return (
    <div className="flex flex-col h-full bg-terminal-bg font-mono text-sm overflow-y-auto terminal-scrollbar">
      {/* Theme */}
      <Section title="THEME">
        <div className="grid grid-cols-2 gap-2">
          {themes.map((t) => {
            const active = t.name === currentTheme
            return (
              <button
                key={t.name}
                onClick={() => applyTheme(t.name)}
                className={`flex items-center gap-3 px-3 py-2 rounded border text-left cursor-pointer ${
                  active ? 'bg-terminal-green/10' : 'hover:bg-terminal-green/5'
                }`}
                style={{
                  borderColor: active
                    ? 'color-mix(in srgb, var(--color-terminal-green) 55%, transparent)'
                    : border,
                }}
              >
                <span
                  className="w-8 h-8 shrink-0 rounded border flex items-center justify-center text-base"
                  style={{
                    backgroundColor: t.colors.bg,
                    color: t.colors.text,
                    borderColor: t.colors.textDim,
                  }}
                >
                  A
                </span>
                <span className={active ? 'text-terminal-green' : 'text-terminal-green-dark'}>
                  {t.label}
                  {active && <span className="block text-xs text-terminal-cyan">active</span>}
                </span>
              </button>
            )
          })}
        </div>
      </Section>

      {/* Sound */}
      <Section title="SOUND">
        <div className="flex items-center gap-4">
          <button
            onClick={() => updateSound({ ...sound, enabled: !sound.enabled })}
            className={`h-7 px-3 rounded border text-xs tracking-widest uppercase cursor-pointer ${
              sound.enabled
                ? 'bg-terminal-green/15 text-terminal-green'
                : 'text-terminal-green-dark hover:text-terminal-green'
            }`}
            style={{ borderColor: border }}
          >
            {sound.enabled ? 'on' : 'off'}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(sound.volume * 100)}
            onChange={(e) => updateSound({ ...sound, volume: Number(e.target.value) / 100 })}
            className="flex-1 accent-[var(--color-terminal-green)]"
            disabled={!sound.enabled}
          />
          <span className="text-terminal-green-dark w-10 text-right tabular-nums">
            {Math.round(sound.volume * 100)}%
          </span>
        </div>
      </Section>

      {/* Account */}
      <Section title="ACCOUNT">
        {!hasClerkKey ? (
          <div className="text-terminal-green-dark italic">
            Authentication is not configured (VITE_CLERK_PUBLISHABLE_KEY).
          </div>
        ) : user ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-terminal-green truncate">{user}</div>
              {userInfo?.email && (
                <div className="text-terminal-green-dark text-xs truncate">{userInfo.email}</div>
              )}
            </div>
            <button
              onClick={() => authCallbacks.signOut?.()}
              className="h-7 px-3 rounded border text-xs tracking-widest uppercase text-terminal-red hover:bg-terminal-red/15 cursor-pointer shrink-0"
              style={{ borderColor: border }}
            >
              sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-terminal-green-dark">Not signed in — state is local only.</span>
            <button
              onClick={() => authCallbacks.openSignIn?.()}
              className="h-7 px-3 rounded border text-xs tracking-widest uppercase text-terminal-green-dark hover:text-terminal-green hover:bg-terminal-green/10 cursor-pointer shrink-0"
              style={{ borderColor: border }}
            >
              sign in
            </button>
          </div>
        )}
      </Section>

      {/* About */}
      <Section title="ABOUT">
        <div className="text-terminal-green-dark leading-relaxed">
          <div>
            <span className="text-terminal-green">CI-OS</span> — desktop shell for the terminal
            simulator.
          </div>
          <div>Same file system, tasks and theme as the fullscreen terminal at /.</div>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="px-4 py-3 border-b"
      style={{ borderBottomColor: 'color-mix(in srgb, var(--color-terminal-green) 15%, transparent)' }}
    >
      <div className="text-terminal-green font-bold tracking-widest text-xs mb-2 terminal-glow">{title}</div>
      {children}
    </div>
  )
}
