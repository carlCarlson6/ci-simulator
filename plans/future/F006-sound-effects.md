# Implementation Plan: Sound Effects

**Goal:** Add ambient sound effects and UI feedback sounds to the terminal — keystroke click, command execution thud, error beep, and optional background ambient track.

**Status:** ✅ Complete

---

## Overview

Sound effects are implemented using the Web Audio API (no external audio files or libraries). Sounds are synthesized programmatically — oscillator-based beeps, clicks, and drones that fit the cyberpunk aesthetic. A `sound` command toggles sound on/off and controls volume.

**Architecture Pattern:** A `SoundEngine` singleton class wrapping Web Audio API calls, gated by a user preference stored in `localStorage`.

---

## Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Web Audio API** — synthesize sounds programmatically | Zero audio file dependencies; keeps bundle small |
| 2 | **Opt-in by default** — sound is off; user enables via `sound on` | Non-intrusive; respects user environment |
| 3 | **`sound` command** to control: `sound on`, `sound off`, `sound volume 0.5` | Single command for all sound control |
| 4 | **No background music track** — only UI feedback sounds | Ambient drone would get annoying; keep it subtle |
| 5 | **Preference persisted to `localStorage`** | Remembered across sessions |

---

## Micro-Decisions

| # | Decision | Rationale |
|---|---|---|
| A | Keystroke sound: short 800Hz sine wave, 20ms duration, very low volume (0.05) | Subtle click, not distracting |
| B | Command execution sound: short 400Hz square wave, 50ms | Satisfying "thunk" feel |
| C | Error sound: 200Hz sawtooth, 150ms, descending pitch | Alerting but not harsh |
| D | Tab-complete sound: short 1000Hz sine, 30ms | Different pitch from keystroke for recognition |
| E | All sounds use gain envelope (attack/release) to avoid clicks/pops | Clean audio requires envelope shaping |
| F | `sound volume 0` = mute; `sound volume 1` = max (default 0.3) | Volume range 0-1 |
| G | No stereo panning — all sounds mono | Simpler; terminal doesn't need spatial audio |

---

## Files to Create

### 1. `src/lib/soundEngine.ts` — Sound engine

```ts
class SoundEngine {
  private audioCtx: AudioContext | null = null
  private enabled: boolean = false
  private volume: number = 0.3

  async init(): Promise<void>   // Lazy-create AudioContext on first user interaction
  play(type: SoundType): void   // 'keystroke' | 'command' | 'error' | 'tabcomplete'
  setEnabled(val: boolean): void
  setVolume(val: number): void
}

export const soundEngine = new SoundEngine()
```

**Sound synthesis helpers** (private methods):

- `playTone(freq, type, duration, volume)` — base method
  - Creates `OscillatorNode` + `GainNode`
  - Gain envelope: ramp up 5ms, sustain, ramp down 10ms
  - Connects to `audioCtx.destination`
- Each sound type calls `playTone` with specific parameters

---

## Files to Modify

### 2. `src/lib/terminalStore.ts` — Add sound state

```ts
soundEnabled: boolean
soundVolume: number
setSoundEnabled: (val: boolean) => void
setSoundVolume: (val: number) => void
```

Load initial values from `localStorage`:
```ts
const savedSound = localStorage.getItem('ci-simulator-sound')
soundEnabled: savedSound ? JSON.parse(savedSound).enabled : false,
soundVolume: savedSound ? JSON.parse(savedSound).volume : 0.3,
```

### 3. `src/lib/commands/index.ts` — Hook sounds into dispatch

After command execution (or on error), call `soundEngine.play('command')` or `soundEngine.play('error')`.

### 4. `src/components/TerminalInput.tsx` — Keystroke sound

On each `onChange` / keypress event (when not navigating history), call `soundEngine.play('keystroke')`.

### 5. `src/lib/commands/sound.ts` — New command

**Handler logic**:
1. `sound on` → enable, play test beep
2. `sound off` → disable
3. `sound volume 0.5` → set volume
4. `sound` (no args) → show current status: `Sound: ON | OFF (volume: 0.3)`
5. `sound status` → same as no args

```ts
export const MANUAL = 'sound\n\nControl terminal sound effects.\n\nUsage: sound [on|off|volume <n>|status]'
export const HELP_TEXT = '  sound [on|off|volume]  Control sound effects'
```

### 6. `src/lib/commands/help.ts` — Add help text

### 7. `src/lib/commands/man.ts` — Add manual page

---

## Testing Checklist

1. `sound on` → enables sound, plays test beep
2. Type a character → subtle keystroke click
3. Run `ls` → command execution thud
4. Run `ls nonexistent` → error beep
5. `sound off` → all sounds stop
6. `sound volume 0.5` → volume changes
7. Refresh page → sound preference restored
8. Tab complete → different-pitched sound from keystroke

---

## Status

**Status:** ✅ Complete — implemented 2026-06-28.

---

## Related Documents

- [F004-terminal-games.md](F004-terminal-games.md) — Sound effects would enhance game feedback
