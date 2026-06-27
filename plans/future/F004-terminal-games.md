# Implementation Plan: Terminal Games (`snake`, `2048`, `tetris`)

**Goal:** Add play-in-terminal games via `snake`, `2048`, and `tetris` commands — lightweight implementations rendered using the existing terminal output lines and keyboard input capture.

**Status:** 📝 Planned

---

## Overview

Each game runs as a state machine inside a command handler, rendering its frame to terminal output lines. Keyboard input is captured via the existing `TerminalInput` component but routed to the game state instead of the command line while a game is active. Games use full-screen terminal output (clear terminal, render game board, handle input loop).

**Architecture Pattern:** Command handler launches game; game engine owns render loop and input handling via a new "game mode" in the terminal store.

---

## Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Games rendered as terminal output lines** — not canvas, not modal | Preserves terminal illusion; consistent with cyberpunk aesthetic |
| 2 | **Game mode flag in Zustand store** — when active, keyboard input goes to game, not command line | Clean separation; existing input handler checks game mode |
| 3 | **No external game libraries** — hand-written game logic | Zero dependency bloat; each game is 200-400 lines |
| 4 | **Snake and 2048 first (simpler), Tetris last** (most complex) | Phased delivery of the 3 games |
| 5 | **Arrow keys / WASD for all games** | Consistent controls; WASD as fallback for mobile/non-arrow scenarios |
| 6 | **Games run on `requestAnimationFrame` loop** with tick-based state updates | Smooth gameplay without blocking the main thread |

---

## Micro-Decisions

| # | Decision | Rationale |
|---|---|---|
| A | Each game is a separate command (`snake`, `2048`, `tetris`) | Clean discoverability via `help` |
| B | Game ends with final score printed to terminal; prompt returns | Not a modal — no Escape needed, just game-over |
| C | High score persisted to `localStorage` under `ci-simulator-games-{game}` | Light persistence without cluttering main filesystem storage |
| D | Board characters: `█` blocks, `.` empty, `@` food/special | Unicode block characters fit the cyberpunk aesthetic |
| E | Pause with `p` or `Escape` during game | Standard game UX |
| F | Quit with `q` or `Ctrl+C` during game | Returns to terminal prompt immediately |

---

## Files to Create

### 1. `src/lib/games/snake.ts` — Snake game engine

- Grid: 20×40 cells rendered as terminal characters
- State: snake body as `{x, y}[]`, direction vector, food position, score, game-over flag
- Tick: move snake, check collision (walls/self), check food
- Render: full clear + draw board + score line
- Input: `ArrowUp`/`w`, `ArrowDown`/`s`, `ArrowLeft`/`a`, `ArrowRight`/`d`

### 2. `src/lib/games/game2048.ts` — 2048 game engine

- Grid: 4×4 board rendered with padded number tiles
- State: grid values (0 = empty), score, game-over flag
- Tick: on arrow key, slide/merge tiles, spawn random 2 or 4
- Render: full clear + draw grid + score line
- Win condition: 2048 tile reached (can continue playing)

### 3. `src/lib/games/tetris.ts` — Tetris game engine

- Grid: 20×10 cells
- State: current piece (type, rotation, position), board grid, score, level, game-over
- Tick: gravity timer (speed increases with level), lock piece, clear lines, spawn next
- Render: full clear + draw board + next piece preview + score/level/lines
- Controls: arrows for move/rotate, hard drop with space

---

## Files to Modify

### 4. `src/lib/terminalStore.ts` — Add game mode state

**Add to `TerminalState`**:
```ts
gameMode: boolean
activeGame: string | null     // 'snake' | '2048' | 'tetris'
gameController: ((key: string) => void) | null
startGame: (name: string, controller: (key: string) => void) => void
stopGame: () => void
```

### 5. `src/components/TerminalInput.tsx` — Route keys to game

When `gameMode` is true, key events go to `gameController` instead of the input buffer.

### 6. `src/lib/commands/index.ts` — Register game commands

Add `snake`, `2048`, `tetris` to command registry.

### 7. `src/lib/commands/snake.ts`, `2048.ts`, `tetris.ts` — Command handlers

Each handler:
1. Clears terminal
2. Sets game mode in store
3. Starts game engine loop
4. On game over: prints score, exits game mode, returns prompt

### 8. `src/lib/commands/help.ts` — Add help text entries

### 9. `src/lib/commands/man.ts` — Add manual pages

---

## Testing Checklist

1. `snake` → game starts, arrow keys move snake, eating food grows snake, wall/self collision ends game
2. `2048` → game starts, arrow keys slide tiles, merges work, new tiles spawn randomly
3. `tetris` → game starts, pieces fall, rotation works, line clearing works, game over at top
4. `q` during any game → returns to terminal prompt immediately
5. `p` during any game → pauses/unpauses
6. Score displayed on game over
7. High score persists across page reloads

---

## Status

**Status:** 📝 Planned — not yet implemented.

---

## Related Documents

- [F006-sound-effects.md](F006-sound-effects.md) — Sound effects could enhance game experience
