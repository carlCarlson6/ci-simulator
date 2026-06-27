# Cyberpunk Terminal Simulator

A full-screen terminal simulator built with **React**, **Vite**, **TanStack Router**, and **TypeScript**. Features a cyberpunk/Matrix-inspired UI with neon green-on-black aesthetics, a fully simulated in-memory file system, and real server-side system info via a Vite API middleware.

> **Implementation Status:** All 9 phases of [P001-implementation.md](plans/P001-implementation.md) completed. Terminal is fully functional.  
> **UX Improvements:** ✅ Complete — see [P002-terminal-ux-improvements.md](plans/P002-terminal-ux-improvements.md)

---

## 🎯 Project Scope

**Goal:** Build a browser-based terminal that feels like a real Unix shell, with a striking cyberpunk visual identity.

**Core Features:**
- Full-screen terminal UI with neon green-on-black color scheme
- In-memory file system (flat Map structure) with pre-populated directories and files
- 15 implemented commands with color-coded output
- Command history (up/down arrows) — session-only, not persisted
- Tab completion for commands and file paths
- Real server-side system info (`whoami`, `hostname`, `date`) via Vite API middleware
- Error handling with red neon error messages
- Easter eggs (`rm -rf /`, `sudo`)

**Out of Scope (MVP):**
- File persistence across reloads
- Pipes and redirects (`|`, `>`, `>>`)
- Background jobs
- Multi-tab support
- Real OS command execution (purely simulated)

**Future Enhancements:**
- `theme` command for color scheme switching
- Terminal games (`snake`, `2048`, `tetris`)
- `sudo` easter egg
- File persistence (localStorage or DB)
- Environment variables (`export`, `env`)
- Network commands (`ping`, `curl` — simulated)
- ASCII art generators (`cowsay`, `figlet`)
- Multi-tab terminal sessions
- Sound effects

---

## 🏗️ Architecture

- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4 + TanStack Router
- **State Management:** Zustand (terminal session state)
- **File System:** In-memory flat Map with path keys
- **Server:** Vite API middleware (minimal — system info only)
- **Styling:** Tailwind CSS with custom cyberpunk color tokens

---

## 📁 Project Structure

```
src/
├── components/
│   ├── Terminal.tsx        # Main terminal container
│   ├── TerminalInput.tsx   # Input bar at bottom
│   └── TerminalOutput.tsx  # Scrollable output area
├── lib/
│   ├── fileSystem.ts       # In-memory file system (flat Map)
│   ├── commands.ts         # Command registry & handlers
│   └── terminalStore.ts    # Zustand store for terminal state
├── server/
│   └── system.ts           # Server-side system info (API)
├── styles/
│   └── terminal.css        # Cyberpunk color scheme
├── routes.tsx              # Route tree (TanStack Router)
├── main.tsx                # App entry point
└── routes/
    # (Routes defined in routes.tsx instead)
plans/
└── P001-implementation.md  # Detailed implementation steps
vite.config.ts              # Vite configuration with API middleware
index.html                  # HTML entry point
```

---

## 🚀 Commands Implemented

| Command | Type | Description |
|---------|------|-------------|
| `help` | Simulated | List all available commands |
| `clear` | Simulated | Clear terminal screen |
| `ls` | Simulated | List directory contents |
| `cd` | Simulated | Change directory |
| `pwd` | Simulated | Print working directory |
| `cat` | Simulated | Display file contents |
| `echo` | Simulated | Print arguments |
| `mkdir` | Simulated | Create directory |
| `touch` | Simulated | Create empty file |
| `rm` | Simulated | Remove file or directory |
| `whoami` | **Server** | Display current user (real) |
| `date` | **Server** | Display current date/time (real) |
| `hostname` | **Server** | Display system hostname (real) |
| `history` | Simulated | Show command history |
| `neofetch` | Simulated | ASCII art + system info |

---

## 📋 Implementation Plan

**Status:** All 9 phases completed as of 2026-06-20.  
See [`plans/P001-implementation.md`](plans/P001-implementation.md) for detailed step-by-step implementation with completion annotations.

### Build Phases
| Phase | Status | Notes |
|-------|--------|-------|
| 1. Project Scaffold | ✅ Complete | Vite + React + TanStack Router; `src/` based structure |
| 2. In-Memory File System | ✅ Complete | Flat Map with pre-populated data |
| 3. Terminal State (Zustand) | ✅ Complete | Full store with history, completion, server info |
| 4. Command Registry (15 commands) | ✅ Complete | All commands implemented |
| 5. Terminal UI | ✅ Complete | Cyberpunk styling with glow, scanlines, custom scrollbar |
| 6. Server API | ✅ Complete | Vite middleware for real system info |
| 7. Tab Completion | ✅ Complete | Commands and file paths |
| 8. Polish & Edge Cases | ✅ Complete | Error handling, easter eggs, key shortcuts |
| 9. Future Enhancements List | ✅ Complete | Documented in README below |
| 10. Terminal UX Improvements | ✅ Complete | [P002](plans/P002-terminal-ux-improvements.md) — focus, padding, scroll, styling |

---

## 🎨 Design Tokens

| Token | Value |
|-------|-------|
| Background | `#000000` (pure black) |
| Primary Text | `#00ff00` (matrix green) |
| Prompt User | `#00ff00` |
| Prompt Host | `#00cc00` |
| Prompt Path | `#00aa00` |
| Error Text | `#ff0044` (neon red) |
| Directory Names | `#0099ff` (neon blue) |
| Cursor | `#00ff00` block, blinking |
| Font | JetBrains Mono / Fira Code |
| Font Size | `14px` |
| Line Height | `1.4` |

---

## 🛠️ Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
```

The app will be available at `http://localhost:3000` (or the next available port if 3000 is in use).

---

## 📝 TODO

- [ ] **`sudo` easter egg** — "You are not in the sudoers file. This incident will be reported."

---

## 📜 License

MIT
