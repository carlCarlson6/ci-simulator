# Implementation Plan: Virtual Operating System Evolution

**Goal:** Evolve the cyberpunk terminal simulator from a single-window terminal into a simulated operating system with a graphical desktop environment, process management, shell scripting, filesystem depth, networking, and developer tooling — while keeping the original terminal accessible as a core application.

**Status:** 📝 Planned

---

## Design Principles

| # | Principle | Rationale |
|---|---|---|
| 1 | **Terminal always accessible** at `/` — the desktop is additive, not a replacement | Users who love the current terminal shouldn't lose it |
| 2 | **Desktop at `/desktop`** — new route, new component tree | Separation of concerns; clean TanStack Router route |
| 3 | **Progressive enhancement** — each phase is independently shippable | Avoid a megaproject; ship value continuously |
| 4 | **Zustand store stays the source of truth** — desktop reads same filesystem, env, user state | No dual-state bugs |
| 5 | **Fake it till you make it** — simulate OS behaviors without real kernel primitives | Pragmatic; the charm is in the simulation |
| 6 | **Terminal becomes a windowed app** on the desktop, but still fullscreen at `/` | Dual-mode: standalone route and embeddable component |

---

## Route Architecture

```
/                    → Terminal (fullscreen, unchanged - current behavior)
/desktop             → DesktopEnvironment (window manager + desktop UI)
/desktop?app=terminal → Desktop opens with terminal window focused
/desktop?app=files   → Desktop opens with file manager window focused
/<pageName>          → wwwroot page (unchanged)
```

**File layout:**
```
src/routes/
├── __root.tsx              ← unchanged
├── index.tsx               ← Terminal component (unchanged)
├── $pageName.tsx           ← wwwroot pages (unchanged)
└── desktop.tsx             ← NEW: Desktop environment route
```

---

## Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Desktop at `/desktop` route**, not replacing `/` | Terminal stays as-is; desktop is opt-in |
| 2 | **Terminal becomes a reusable component** (`<TerminalEmbed />`) in addition to `<Terminal>` | Desktop embeds terminal in a floating window; route still renders full-screen version |
| 3 | **Window manager uses zustand** (`desktopStore.ts`) separate from `terminalStore.ts` | Desktop state (window positions, open apps) is orthogonal to terminal state |
| 4 | **No Canvas-based compositor** — windows are CSS `<div>` elements | Simpler, accessible, responsive, performs well |
| 5 | **Process system lives in `terminalStore.ts`** — shared between terminal and desktop | Both views should see the same process table |
| 6 | **Pipes and redirections parsed at dispatch layer** — command handlers stay pure | Maximum backward compatibility; commands don't need rewrites |
| 7 | **Package manager sources from a JSON registry** (static or server-function) | Simple, auditable, no runtime code generation |
| 8 | **Multi-user is in-memory with optional server sync** | Works offline; Clerk users get cross-session persistence |
| 9 | **Boot sequence on `/desktop` only** — `/` terminal is instant-on | Don't add friction for terminal-only users |
| 10 | **New commands coexist alongside existing ones** — same registry, same dispatch | No fragmentation; `ps` works in both terminal and desktop terminal window |

---

## Micro-Decisions

| # | Decision | Rationale |
|---|---|---|
| A | Window IDs are incrementing integers | Simple, unique, no UUID overhead |
| B | Minimized windows hide from viewport but stay in state | Restore brings them back at same position |
| C | Desktop icons launch apps with configurable `onOpen` callbacks | Extensible for future apps |
| D | Canvas framebuffer toggles terminal output to `<canvas>` element | `fb*` commands switch mode; `exit` goes back to text |
| E | `pkg install` fetches command code via server function | Avoids bundling all commands; enables community packages |
| F | Script files (`*.sh`) parsed recursively with AST caching | Performance: parse once, cache by file path + mtime |
| G | Pipe output captured as string array in `CommandResult.pipedOutput` | Simple, no streaming; sufficient for simulation |
| H | `/proc/<pid>/` entries generated on read from live process table | Classic `/proc` pattern; always up-to-date |
| I | `sudo` checks `/etc/sudoers` (editable file in FS) | Configurable; users can edit it via `edit` command |
| J | Network simulation uses `setTimeout` for latency | Ping times vary by "distance" to virtual host |
| K | Boot sequence skippable via `Ctrl+C` or click | Impatient users don't have to watch it |

---

## Phases

---

### Phase 1: Route Scaffold & Desktop Shell

**Goal:** Create the `/desktop` route with a basic desktop container and navigation between `/` and `/desktop`.

**Status:** 📝 Planned

**Architecture:**
```
src/
├── routes/desktop.tsx              ← NEW: Desktop route with loader
├── components/desktop/
│   ├── Desktop.tsx                 ← NEW: Root desktop container
│   ├── DesktopNav.tsx              ← NEW: Top bar with "Terminal" link back
│   └── DesktopBackground.tsx       ← NEW: Animated background (Matrix rain / wallpaper)
└── lib/
    └── desktopStore.ts             ← NEW: Zustand store for desktop UI state
```

**Files to Create:**

#### 1. `src/routes/desktop.tsx` — Desktop route

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { Desktop } from '../components/desktop/Desktop'
import { getUser, loadServerState } from '../lib/server-fns'
import type { ServerStatePayload } from '../lib/serverStorage'

export const Route = createFileRoute('/desktop')({
  loader: async (): Promise<{
    user: { id: string; username: string } | null
    serverState: ServerStatePayload | null
  }> => {
    const user = await getUser()
    if (!user) return { user: null, serverState: null }
    const serverState = await loadServerState()
    return { user, serverState }
  },
  component: Desktop,
})
```

#### 2. `src/lib/desktopStore.ts` — Desktop UI state

```typescript
import { create } from 'zustand'

type WindowState = {
  id: number
  app: string              // 'terminal' | 'files' | 'editor' | 'settings'
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
  wallpaper: string        // theme variant

  openWindow: (app: string, title: string) => number
  closeWindow: (id: number) => void
  minimizeWindow: (id: number) => void
  restoreWindow: (id: number) => void
  focusWindow: (id: number) => void
  moveWindow: (id: number, x: number, y: number) => void
  resizeWindow: (id: number, width: number, height: number) => void
}
```

#### 3. `src/components/desktop/Desktop.tsx` — Desktop container

- Full viewport, dark background with animated wallpaper
- Renders all windows from `desktopStore`
- Window frame with title bar, close/minimize/maximize buttons
- Drag handling via `onMouseDown`/`onMouseMove`/`onMouseUp`
- Desktop icons for: Terminal, Files, Editor, Settings
- Navigation link: "⌂ Terminal" to go back to `/`

#### 4. `src/components/desktop/DesktopNav.tsx` — Navigation bar

- Top bar with "⌂ Terminal" link back to `/`
- Clock display (updates every second)
- Desktop title: "CI-OS v1.0.0"

#### 5. `src/components/desktop/DesktopBackground.tsx` — Animated background

- Matrix rain animation (CSS/Canvas)
- Configurable via theme
- Subtle vignette overlay (reuse from Terminal)

---

### Phase 2: Terminal as Embeddable Window App

**Goal:** Extract a `<TerminalEmbed />` component that works inside a floating window on the desktop, while keeping the fullscreen `<Terminal>` at `/` unchanged.

**Status:** 📝 Planned

**Architecture Pattern:** The `<Terminal>` component at `/` uses all the same internals — it renders `<TerminalOutput>`, `<TerminalInput>`, modals, scanlines. The embedded version strips the outer chrome (scanlines, full-screen sizing) and fits inside a window frame.

**Files to Modify:**

#### 1. `src/components/Terminal.tsx` — Extract embed variant

Extract the terminal internals into a shared component, keeping the fullscreen wrapper as the route component:

```tsx
// TerminalEmbed — the core terminal UI without outer chrome
export function TerminalEmbed() {
  return (
    <div className="flex flex-col h-full w-full font-mono overflow-hidden">
      <div className="flex-1 overflow-hidden min-h-0">
        <TerminalOutput />
      </div>
      <div className="shrink-0 w-full px-4 pb-2">
        <TerminalInput />
      </div>
      <EditorModal />
      <MarkdownModal />
    </div>
  )
}

// Terminal — full-screen route component, wraps TerminalEmbed
export function Terminal() {
  // ... loader data, theme CSS variables, AuthSyncGate ...
  // ... scanlines, vignette, outer chrome ...
  return (
    <div className="flex flex-col h-screen w-screen ..." style={themeVars}>
      <AuthSyncGate />
      <div className="relative flex-1 ...">
        <TerminalEmbed />
      </div>
      {/* scanlines, vignette */}
    </div>
  )
}
```

#### 2. `src/lib/terminalStore.ts` — No changes needed

The Zustand store is already shared — both the full-screen terminal and desktop terminal window subscribe to the same store.

---

### Phase 3: Process System (PID, Jobs, Signals)

**Goal:** Every command dispatch creates a simulated process with PID, state lifecycle, and job control.

**Status:** 📝 Planned

**Architecture:**
```
src/lib/
└── processManager.ts      ← NEW: Process table, PID allocation, signal dispatch
```

**Files to Create:**

#### 1. `src/lib/processManager.ts` — Process table

```typescript
export type ProcessState = 'running' | 'sleeping' | 'stopped' | 'zombie'

export type Process = {
  pid: number
  ppid: number
  command: string
  args: string[]
  state: ProcessState
  startedAt: number
  exitCode: number | null
  foreground: boolean
  session: number      // session ID (usually the terminal PID)
}

class ProcessManager {
  private processes: Map<number, Process> = new Map()
  private nextPid: number = 1

  spawn(ppid: number, command: string, args: string[], foreground: boolean): number
  get(pid: number): Process | undefined
  kill(pid: number, signal: number): boolean
  list(): Process[]
  getBySession(session: number): Process[]
  wait(pid: number): Promise<number>   // wait for process to complete
  getNextPid(): number
}
```

`terminalStore.ts` gains:
```typescript
processManager: ProcessManager
shellPid: number       // PID of the shell itself
sessionId: number      // session ID
```

`executeCommand` wraps dispatch:
```
1. Create Process entry (pid, ppid=shellPid, command, state='running')
2. Run command handler
3. On completion, set state='zombie', record exitCode
4. If foreground, wait for completion before showing next prompt
```

**New Commands (files under `src/lib/commands/`):**

| File | Handler | Description |
|---|---|---|
| `ps.ts` | `ps(args, ctx)` | `ps`, `ps -a`, `ps -u`, `ps -ef`, `ps aux` — reads `processManager.list()` |
| `kill.ts` | `kill(args, ctx)` | `kill -9 42`, `kill -SIGTERM 42`, `kill -l` |
| `killall.ts` | `killall(args, ctx)` | `killall -9 node` — kill by command name |
| `jobs.ts` | `jobs(args, ctx)` | Lists background jobs for this shell session |
| `bg.ts` | `bg(args, ctx)` | Resume job in background: `bg %1` |
| `fg.ts` | `fg(args, ctx)` | Bring job to foreground: `fg %1` |
| `disown.ts` | `disown(args, ctx)` | Remove job from shell's job table |
| `nohup.ts` | `nohup(args, ctx)` | Run command immune to hangups |
| `wait.ts` | `wait(args, ctx)` | Wait for background process completion |

**`&` operator:** Modified in `index.ts` command dispatch — if input ends with `&`, strip it, set `foreground: false`, and immediately show next prompt.

**Store integration:** Updated `executeCommand` in `terminalStore.ts`:
```typescript
executeCommand: (input: string) => {
  // ... parse command ...
  const pid = state.processManager.spawn(
    state.shellPid, command, args, foreground
  )
  const result = executeCommand(trimmed, { ...context, pid })
  if (foreground) {
    state.processManager.setExit(pid, result.success ? 0 : 1)
    // render output, show next prompt
  } else {
    // show background job notification: [1] + 42
    // immediately show next prompt
  }
}
```

---

### Phase 4: Pipes, Redirections & Shell Composition

**Goal:** Support `|`, `>`, `>>`, `<` operators for command composition.

**Status:** 📝 Planned

**(Based on existing `plans/future/F002-pipes-redirects.md`, expanded here.)**

**Files to Create:**

#### 1. `src/lib/parser.ts` — Command line parser

```typescript
export type PipelineStage = {
  command: string
  args: string[]
}

export type Redirect = {
  target: 'file'
  mode: 'overwrite' | 'append'
  path: string
}

export type ParsedPipeline = {
  stages: PipelineStage[]
  redirect: Redirect | null
  inputRedirect: string | null   // < file
}
```

**Parsing algorithm:**
1. Split input on `|`, `>`, `>>`, `<` (respecting quotes — future)
2. For last segment (or any segment), check for `> path` / `>> path` tokens
3. Strip redirect tokens from args
4. Return parsed structure

#### 2. `src/lib/commands/types.ts` — Extend types

Add to `CommandContext`:
```typescript
pipedInput?: string[]
pid?: number
```

Add to `CommandResult`:
```typescript
pipedOutput?: string[]
```

Add to `CommandHandler`:
```typescript
type CommandHandler = (args: string[], context: CommandContext) => CommandResult
// Commands that accept piped input check context.pipedInput when no file arg is given
```

**Files to Modify:**

#### 3. `src/lib/commands/index.ts` — Pipeline dispatch

```typescript
export function executeCommand(input: string, context: CommandContext): CommandResult {
  const pipeline = parsePipeline(input)
  
  if (pipeline.stages.length === 1 && !pipeline.redirect && !pipeline.inputRedirect) {
    // Fast path: single command, no redirect — same as current behavior
    return executeSingle(pipeline.stages[0], context)
  }

  // Pipeline execution
  let pipedOutput: string[] | undefined
  for (let i = 0; i < pipeline.stages.length; i++) {
    const stage = pipeline.stages[i]
    const stageContext = {
      ...context,
      pipedInput: pipedOutput,
    }
    const result = executeSingle(stage, stageContext)
    if (!result.success) return result  // pipeline stops on failure
    
    pipedOutput = result.pipedOutput
  }

  // Handle redirect
  if (pipeline.redirect) {
    const output = pipedOutput?.join('\n') ?? ''
    // write to file
    if (output) {
      context.fileSystem.writeFile(
        context.fileSystem.resolvePath(pipeline.redirect.path, context.currentPath),
        output
      )
    }
    return { success: true }
  }

  // Last stage's output goes to terminal
  return {
    success: true,
    data: { output: pipedOutput?.join('\n') }
  }
}
```

#### 4. `src/lib/commands/grep.ts` — NEW: accept piped input

If no file argument and `context.pipedInput` is set, filter piped lines.

#### 5. `src/lib/commands/cat.ts` — Accept piped input

If `-` or no file arg and `context.pipedInput`, output piped lines.

---

### Phase 5: Shell Scripting

**Goal:** Execute `.sh` files with variables, control flow, functions.

**Status:** 📝 Planned

**Files to Create:**

#### 1. `src/lib/shellAST.ts` — AST node types

```typescript
export type ShellNode =
  | CommandNode     // { type: 'command', command: string, args: ShellExpr[] }
  | PipelineNode    // { type: 'pipeline', stages: ShellNode[], redirect?: ... }
  | IfNode          // { type: 'if', condition: ShellNode, then: ShellNode[], else?: ShellNode[] }
  | ForNode         // { type: 'for', var: string, in: string[], body: ShellNode[] }
  | WhileNode       // { type: 'while', condition: ShellNode, body: ShellNode[] }
  | FuncDefNode     // { type: 'funcdef', name: string, body: ShellNode[] }
  | VariableNode    // { type: 'var', name: string, default?: string }
  | StringNode      // { type: 'string', value: string }
  | SequenceNode    // { type: 'seq', commands: ShellNode[] }
```

#### 2. `src/lib/shellParser.ts` — Recursive descent parser

Parses a script string into an AST. Handles:
- `;` and newline separators
- `if/then/elif/else/fi`
- `for var in list; do ... done`
- `while condition; do ... done`
- `funcname() { ... }`
- `$VAR`, `${VAR:-default}`, `$(command)`
- `$(( arithmetic ))` — basic integer math
- `&&` and `||` short-circuit

#### 3. `src/lib/shellExecutor.ts` — AST walker

Walks the AST, executing nodes. Maintains:
- Variable scope (local vs global)
- Function table
- Exit codes for conditionals
- Loop iteration state

**Store integration:** When a `.sh` file is executed (via shebang detection in `executeCommand`):
1. Read file from filesystem
2. Parse into AST
3. Walk AST with current environment
4. Each `command` node delegates to existing `executeCommand` dispatch
5. Output collected and returned line by line

**New Commands:**

| File | Handler | Description |
|---|---|---|
| `source.ts` | `source file.sh` | Execute script in current shell context (shared vars) |
| `read.ts` | `read VAR` | Read line from stdin into variable |
| `test.ts` | `test -f file`, `[ -d dir ]` | Condition testing |
| `exit.ts` | `exit [code]` | Exit with code |
| `return.ts` | `return [code]` | Return from function |
| `local.ts` | `local VAR=value` | Local variable declaration |
| `export.ts` (extend) | `export -f funcname` | Export function to sub-processes |
| `alias.ts` | `alias ll='ls -la'` | Command aliases |

---

### Phase 6: Filesystem Depth

**Goal:** Permissions, symbolic links, virtual filesystems (`/proc`, `/dev`), device files.

**Status:** 📝 Planned

**Files to Modify:**

#### 1. `src/lib/fileSystem.ts` — FileNode upgrade

```typescript
export type FileType = 'file' | 'directory' | 'link' | 'device' | 'proc'

export type FileNode = {
  type: FileType
  content?: string
  mode: number           // e.g. 0o644, 0o755
  uid: number
  gid: number
  atime: number
  mtime: number
  ctime: number
  linkTarget?: string    // resolved on read for symlinks
}

export class FileSystem {
  // Existing methods unchanged
  // Add:
  chmod(path: string, mode: number): void
  chown(path: string, uid: number, gid: number): void
  symlink(target: string, linkPath: string): void
  readlink(path: string): string
  stat(path: string): FileNode
  getProcPath(pid: number): string
}
```

**Add permission checks** to existing methods (`readFile`, `writeFile`, `listDirectory`):
- Check `FileNode.mode` against current user's UID
- Root (uid=0) bypasses all checks
- Return `EPERM` error if denied

**New Commands:**

| File | Handler | Description |
|---|---|---|
| `chmod.ts` | `chmod 755 file`, `chmod +x file` | Change file mode |
| `chown.ts` | `chown user:group file` | Change owner/group |
| `ln.ts` | `ln -s target link`, `ln target link` | Symbolic and hard links |
| `stat.ts` | `stat file` | Display file metadata |
| `umask.ts` | `umask 022` | Set default permission mask |
| `mount.ts` | `mount` | Display mounted filesystems |

**Virtual `/proc/` filesystem:**
- `/proc/cpuinfo` — generated on read from `terminalStore` system info
- `/proc/meminfo` — generated from memory state
- `/proc/<pid>/status` — generated from process manager
- `/proc/<pid>/cmdline` — command line args
- `/proc/uptime` — time since boot

**Virtual `/dev/` filesystem:**
- `/dev/null` — discards writes, returns empty on read
- `/dev/zero` — returns null bytes on read
- `/dev/random` — returns random bytes on read
- `/dev/stdin` — reads from current input
- `/dev/stdout` — writes to terminal output
- `/dev/stderr` — writes to terminal error

Implementation: Resolve virtual paths in `readFile` / `writeFile` by checking if path starts with `/proc/` or `/dev/` and generating content on-the-fly.

---

### Phase 7: Desktop Icons, Taskbar, and Window Manager

**Goal:** A complete desktop experience with icons, taskbar, draggable windows, and start menu.

**Status:** 📝 Planned

**Files to Create:**

#### 1. `src/components/desktop/DesktopIcons.tsx` — Desktop icon grid

```tsx
const DESKTOP_APPS = [
  { id: 'terminal', label: 'Terminal', icon: '>' },
  { id: 'files', label: 'Files', icon: '📁' },
  { id: 'editor', label: 'Editor', icon: '📝' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
]
```

- Grid of clickable icons on desktop background
- Double-click opens window via `desktopStore.openWindow()`
- Icons highlight on hover, show label below

#### 2. `src/components/desktop/Window.tsx` — Draggable window frame

```tsx
type WindowProps = {
  id: number
  app: string
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
  children: ReactNode
}
```

Window behavior:
- Title bar with app icon, title text, and buttons (close, minimize)
- Drag by title bar (track mouse delta)
- Resize from bottom-right corner
- Click anywhere → focus (bring to top z-index)
- Minimize → collapse to taskbar entry
- Close → remove from `desktopStore`
- PS/2-style window borders (retro theme, 1px solid green)

#### 3. `src/components/desktop/Taskbar.tsx` — Bottom taskbar

- Left: Start button → opens start menu
- Center: Window buttons for each open window (click to focus/minimize)
- Right: Clock (HH:MM:SS), system tray icons (user, network status)

#### 4. `src/components/desktop/StartMenu.tsx` — Start menu

- Pops up from Start button
- Lists all available apps
- Click to launch (opens window via `desktopStore.openWindow`)
- Bottom section: "Terminal" (navigates to `/`), "Logout", "Shutdown"

**Files to Modify:**

#### 5. `src/components/desktop/Desktop.tsx` — Integrate window manager

```
Desktop
├── DesktopBackground      (animated background layer)
├── DesktopIcons           (icon grid)
├── Window[]               (draggable windows, each with app content)
│   ├── TerminalEmbed      (if app === 'terminal')
│   ├── FileManager        (if app === 'files')
│   └── ...other apps
├── Taskbar                (bottom bar)
└── StartMenu              (conditional overlay)
```

#### 6. New: `src/components/desktop/FileManager.tsx` — File manager window

A graphical file browser:
- Left panel: directory tree (collapsible)
- Right panel: file list with name, size, modified date
- Double-click file to open in editor
- Right-click context menu (New File, New Folder, Delete, Rename)
- Address bar with current path (editable)
- Navigation: Back, Forward, Up

---

### Phase 8: System Utilities & Monitoring

**Goal:** Informational commands that give the simulation OS verisimilitude.

**Status:** 📝 Planned

**New Commands (files under `src/lib/commands/`):**

| File | Handler | Description |
|---|---|---|
| `uname.ts` | `uname -a` | OS name, kernel version, architecture from store |
| `uptime.ts` | `uptime` | Wall time since `window.__START_TIME` |
| `date.ts` | `date`, `date +%Y-%m-%d` | Current simulated date/time |
| `cal.ts` | `cal`, `cal 2025` | Calendar display |
| `free.ts` | `free`, `free -h` | Memory: total/used/free for RAM |
| `lscpu.ts` | `lscpu` | Virtual CPU info |
| `lspci.ts` | `lspci` | Virtual PCI devices |
| `lsblk.ts` | `lsblk` | Block devices |
| `dmesg.ts` | `dmesg` | Kernel ring buffer |
| `hostname.ts` | `hostname`, `hostname newname` | Display/set hostname |
| `id.ts` | `id`, `id username` | User/group ID |
| `df.ts` | `df`, `df -h` | Disk free — /home, /tmp, /var |
| `du.ts` | `du -sh dir` | Directory size |
| `find.ts` | `find . -name '*.ts'` | Recursive file search |
| `grep.ts` | `grep -r pattern dir` | Search file contents |
| `wc.ts` | `wc -l file`, `wc -w file` | Line/word/char count |
| `head.ts` | `head -n 5 file` | First N lines |
| `tail.ts` | `tail -n 5 file` | Last N lines |
| `less.ts` | `less file` | Pager (j/k/q navigation, search with /) |
| `sort.ts` | `sort file` | Sort lines |
| `uniq.ts` | `uniq file` | Filter duplicate lines |
| `diff.ts` | `diff file1 file2` | Line-by-line diff |
| `time.ts` | `time command` | Time command execution |

**System info in store:**
```typescript
// Added to terminalStore.ts
systemInfo: {
  hostname: string        // default: 'ci-simulator'
  kernelVersion: string   // '6.8.0-cios'
  cpuCores: number        // 4
  cpuSpeed: string        // '2.4 GHz'
  totalMemory: number     // 8388608 (8 GB in KB)
  osName: string          // 'CI-OS'
  bootTime: number        // Date.now() at init
}
```

---

### Phase 9: GUI Canvas Framebuffer

**Goal:** A 2D graphics mode — replace the terminal output with an HTML5 Canvas for pixel-level drawing.

**Status:** 📝 Planned

**Architecture:**

```typescript
// In terminalStore.ts
framebuffer: {
  active: boolean
  width: number
  height: number
  canvas: HTMLCanvasElement | null   // ref set by component
}
```

**Files to Create:**

#### 1. `src/lib/framebuffer.ts` — Canvas drawing API

```typescript
export class Framebuffer {
  private ctx: CanvasRenderingContext2D | null = null

  attach(canvas: HTMLCanvasElement): void
  detach(): void

  clear(color?: string): void                    // fill entire canvas
  rect(x: number, y: number, w: number, h: number, color: string): void
  fill(color: string): void
  text(x: number, y: number, text: string, color?: string): void
  pixel(x: number, y: number, color: string): void
  line(x1: number, y1: number, x2: number, y2: number, color: string): void
  circle(cx: number, cy: number, r: number, color: string): void
  image(data: ImageData, x: number, y: number): void
  save(): void                                    // save screenshot to FS
  getState(): ImageData                           // current framebuffer content
}
```

**New Commands:**

| File | Handler | Description |
|---|---|---|
| `fbdraw.ts` | `fbdraw rect 10 10 100 50 #ff0000` | Draw primitives |
| `fbfill.ts` | `fbfill #00ff00` | Fill with color |
| `fbtext.ts` | `fbtext 20 30 "Hello"` | Draw text |
| `fbclear.ts` | `fbclear` | Clear canvas |
| `fbsave.ts` | `fbsave screenshot.png` | Save to filesystem (PPM format) |
| `fbview.ts` | `fbview file.ppm` | Load PPM image to canvas |

**TerminalOutput integration:**
- When `framebuffer.active === true`, hide line-based output and show `<canvas>`
- `exit` command deactivates framebuffer mode, returns to text output

**Built-in applications using framebuffer:**
- `cmatrix` — Matrix rain screensaver (CSS/Cnvas hybrid)
- `mandelbrot` — Zoomable Mandelbrot viewer
- `pong` — Two-player Pong game
- `snake` — Classic snake game (future F004)

**Render in desktop window:**
When Terminal window is open on desktop and framebuffer is active, the canvas renders inside the terminal window (not full-screen).

---

### Phase 10: Package Manager

**Goal:** `pkg install <command>` to install new commands from a remote or built-in registry.

**Status:** 📝 Planned

**Files to Create:**

#### 1. `src/lib/packageManager.ts` — Package registry client

```typescript
export type Package = {
  name: string
  version: string
  description: string
  handlerCode: string          // JavaScript source of the handler function
  dependencies: string[]
  permissions: ('filesystem' | 'network' | 'auth' | 'process')[]
}

export class PackageManager {
  private installed: Map<string, Package> = new Map()
  
  async listRemote(): Promise<Package[]>    // fetch from server
  async install(name: string): Promise<void>
  uninstall(name: string): void
  getInstalled(): Package[]
  get(name: string): Package | undefined
  has(name: string): boolean
  getPermissions(name: string): string[]
}
```

**Server Functions** (add to `src/lib/server-fns.ts`):
```typescript
export const getPackageIndex = createServerFn().handler(async () => {
  // Return static package manifest or query DB
  return PACKAGE_REGISTRY
})

export const getPackage = createServerFn()
  .validator((name: string) => name)
  .handler(async ({ data: name }) => {
    // Return package code for installation
    return PACKAGE_REGISTRY.find(p => p.name === name)
  })
```

**Registry manifest** (static, can evolve to DB-backed):
```typescript
const PACKAGE_REGISTRY = [
  {
    name: 'figlet',
    version: '1.0.0',
    description: 'ASCII art banner generator',
    handlerCode: '...',     // base64 or function source
    dependencies: [],
    permissions: [],
  },
  {
    name: 'cmatrix',
    version: '1.0.0',
    description: 'Matrix rain screensaver',
    handlerCode: '...',
    dependencies: ['fbclear'],
    permissions: [],
  },
  // ... more packages
]
```

**New Command:**

| File | Handler | Description |
|---|---|---|
| `pkg.ts` | `pkg install figlet`, `pkg remove figlet` | Package management |

`pkg` subcommands:
- `pkg update` — refresh remote index
- `pkg install <name>` — fetch + register command
- `pkg remove <name>` — unregister command
- `pkg list` — show installed packages
- `pkg search <term>` — search remote index
- `pkg info <name>` — show package metadata

**Dynamic command registration:**

`src/lib/commands/index.ts` gains:
```typescript
export function registerCommand(name: string, handler: CommandHandler): void {
  commands[name] = handler
}

export function unregisterCommand(name: string): void {
  delete commands[name]
}
```

---

### Phase 11: Multi-User & Security

**Goal:** Multiple user accounts, `su`, `sudo`, groups, permission enforcement.

**Status:** 📝 Planned

**Architecture:**

```typescript
// In terminalStore.ts
users: User[]              // in-memory user database
currentUid: number         // 0 = root, 1000+ = regular users
groups: Group[]            // group definitions
sudoers: string[]          // usernames allowed to sudo (from /etc/sudoers)
```

```typescript
export type User = {
  uid: number
  gid: number
  username: string
  passwordHash: string     // simple hash (e.g., btoa of password)
  homeDir: string
  shell: string
  groups: number[]         // gid list
}
```

**New Commands:**

| File | Handler | Description |
|---|---|---|
| `adduser.ts` | `adduser alice` | Create user (interactive: prompts for password) |
| `deluser.ts` | `deluser alice` | Delete user |
| `passwd.ts` | `passwd` | Change password (interactive) |
| `su.ts` | `su alice`, `su -` | Switch user (with password) |
| `sudo.ts` | `sudo command`, `sudo -u alice command` | Execute as root/user |
| `groups.ts` | `groups`, `groups alice` | List groups |
| `groupadd.ts` | `groupadd devs` | Create group |
| `groupdel.ts` | `groupdel devs` | Delete group |
| `who.ts` | `who` | Who is logged in |
| `users.ts` | `users` | List usernames |
| `last.ts` | `last` | Login history |
| `write.ts` | `write alice msg` | Message another user |
| `wall.ts` | `wall msg` | Message all users |

**Permission enforcement** in `fileSystem.ts`:
- `readFile(path)`: check `uid` against `FileNode.mode & 4` (world-readable) or owner match
- `writeFile(path)`: check `uid` against `FileNode.mode & 2` (world-writable) or owner match
- `listDirectory(path)`: check `uid` against `FileNode.mode & 1` (world-executable) or owner match
- Root (uid=0) bypasses all checks
- `sudo` temporarily elevates uid to 0 for a single command

**Default users:**
- `root` (uid=0, gid=0)
- `user` (uid=1000, gid=1000) — the default unauthenticated user
- Auth (Clerk) users get mapped to existing or auto-created user accounts

---

### Phase 12: Network Simulation

**Goal:** Simulated networking with ping, ports, localhost services, DNS.

**Status:** 📝 Planned

**Architecture:**

```typescript
// In terminalStore.ts
networkState: {
  hostname: string
  interfaces: VirtualInterface[]
  listeningPorts: Map<number, PortHandler>
  arpTable: Map<string, string>       // IP -> MAC
  routingTable: RouteEntry[]
  dnsCache: Map<string, string>       // name -> IP
}
```

```typescript
type VirtualInterface = {
  name: string           // lo, eth0, wlan0
  ip: string
  mac: string
  type: 'loopback' | 'ethernet' | 'wlan'
  mtu: number
  state: 'up' | 'down'
}

type PortHandler = {
  protocol: 'tcp' | 'udp'
  handler: (data: string, from: string) => string
}

type RouteEntry = {
  destination: string
  netmask: string
  gateway: string
  interface: string
}
```

**New Commands:**

| File | Handler | Description |
|---|---|---|
| `ping.ts` | `ping google.com` | Simulated ICMP echo (setTimeout-based latency) |
| `netstat.ts` | `netstat -tlnp` | Show listening ports and connections |
| `ss.ts` | `ss -tlnp` | Modern socket stats |
| `ifconfig.ts` | `ifconfig`, `ifconfig eth0 10.0.0.1` | Configure interfaces |
| `ip.ts` | `ip addr`, `ip link`, `ip route` | Modern ip tool |
| `route.ts` | `route -n` | Display routing table |
| `traceroute.ts` | `traceroute google.com` | Simulated route tracing |
| `nslookup.ts` | `nslookup google.com` | DNS resolution via `/etc/hosts` |
| `host.ts` | `host google.com` | DNS lookup |
| `dig.ts` | `dig google.com` | Detailed DNS query |
| `nc.ts` | `nc -l 8080`, `nc localhost 8080` | Netcat listener/client |
| `listen.ts` | `listen 8080` | Start TCP listener |
| `wget.ts` | `wget http://example.com/file` | Download to filesystem (wraps curl) |

**DNS resolution** via `/etc/hosts`:
```
127.0.0.1  localhost localhost.localdomain
::1        localhost
```

Editable by user — `edit /etc/hosts` to add custom entries.

**Ping simulation:**
```
$ ping google.com
PING google.com (142.250.80.14): 56 data bytes
64 bytes from 142.250.80.14: icmp_seq=0 ttl=118 time=14.2 ms
64 bytes from 142.250.80.14: icmp_seq=1 ttl=118 time=15.1 ms
^C
--- google.com ping statistics ---
2 packets transmitted, 2 packets received, 0% packet loss
round-trip min/avg/max/stddev = 14.2/14.7/15.1/0.45 ms
```

Latency varies by "distance": localhost = 0ms, same subnet = 1-5ms, internet = 10-200ms.

**Port listening:**
```
$ listen 8080 &
[1] 99
$ nc localhost 8080
hello           ← user types
you said: hello ← echo response
^C
```

Port handlers can be:
- Built-in echo server
- HTTP server (serves files from `~/wwwroot/`)
- Custom handlers registered by commands

---

### Phase 13: Boot Sequence & System Initialization

**Goal:** Show a realistic boot sequence when navigating to `/desktop`.

**Status:** 📝 Planned

**Files to Create:**

#### 1. `src/components/desktop/BootSequence.tsx` — Boot animation

```
Boot phases (sequential, timed):
1. BIOS:       "CI-OS BIOS v1.0.0 (build 2026)"  ~0.5s
2. Memory:     "Memory Test: 8192M OK"              ~0.8s
3. Kernel:     "Loading kernel..."                  ~0.5s
4. Services:   "[  OK  ] Mounted /proc"
               "[  OK  ] Mounted /dev"
               "[  OK  ] Started network service"   ~1.5s
5. Login:      "ci-simulator login:" prompt          (wait for Enter)
```

Each line fades in with typewriter effect (green on black). The boot screen can be skipped by pressing `Ctrl+C` or clicking the screen.

**Store state:**
```typescript
bootState: 'booting' | 'login' | 'desktop'
bootLog: string[]          // lines displayed during boot
bootPhase: number          // 0-4
```

**Desktop route component flow:**
```
desktop.tsx
├── if bootState === 'booting' → <BootSequence />
├── if bootState === 'login'   → <LoginScreen />
└── if bootState === 'desktop' → <Desktop />
```

**New Commands:**

| File | Handler | Description |
|---|---|---|
| `shutdown.ts` | `shutdown -h now` | Triggers boot sequence replay on next visit |
| `reboot.ts` | `reboot` | Re-triggers boot sequence immediately |
| `halt.ts` | `halt` | Power off simulation |

---

### Phase 14: Developer Tooling

**Goal:** Turn the terminal into a productive simulated development environment.

**Status:** 📝 Planned

**New Commands:**

| File | Handler | Description |
|---|---|---|
| `sed.ts` | `sed 's/foo/bar/g' file.txt` | Stream editor (basic regex substitution) |
| `awk.ts` | `awk '{print $1}' file` | Pattern scanning (basic field extraction) |
| `tar.ts` | `tar -cf archive.tar dir/` | Archive files (simulated) |
| `zip.ts` | `zip archive.zip file1 file2` | Compression |
| `unzip.ts` | `unzip archive.zip` | Decompression |
| `crontab.ts` | `crontab -e`, `crontab -l` | Schedule recurring commands |
| `at.ts` | `at now + 5 minutes` | One-time scheduled command |
| `make.ts` | `make`, `make build` | Build from simulated Makefile |
| `git.ts` | `git init`, `git add`, `git commit`, ... | Git-lite version control |
| `base64.ts` | `base64 -d file` | Encode/decode |
| `sha256sum.ts` | `sha256sum file` | Hash file |
| `md5sum.ts` | `md5sum file` | MD5 hash |
| `patch.ts` | `patch file.diff` | Apply diff |

**Git-lite implementation:**

Store in `terminalStore`:
```typescript
gitRepos: Map<string, GitRepo>    // path -> repo state

type GitRepo = {
  objects: Map<string, string>     // hash -> content
  refs: { HEAD: string, tags: Record<string, string>, branches: Record<string, string> }
  index: Map<string, string>       // staged files: path -> hash
  head: string                     // current branch name
}
```

Git commands as a single handler with subcommands:
```typescript
handler(args: string[], ctx: CommandContext): CommandResult {
  const subcommand = args[0]
  switch (subcommand) {
    case 'init': /* create .git dir in current path */
    case 'add':  /* stage file(s) to index */
    case 'commit': /* create commit object, update branch ref */
    case 'log':  /* walk commit chain, display */
    case 'diff': /* show unstaged changes */
    case 'status': /* show working tree status */
    case 'branch': /* list/create branches */
    case 'checkout': /* switch branches (stash uncommitted) */
    case 'config': /* set git config */
    default: return { success: false, error: `git: '${subcommand}' is not a git command` }
  }
}
```

---

## Files Summary

### New Files (by phase)

| Phase | File | Purpose |
|---|---|---|
| 1 | `src/routes/desktop.tsx` | Desktop route definition |
| 1 | `src/components/desktop/Desktop.tsx` | Desktop container |
| 1 | `src/components/desktop/DesktopNav.tsx` | Top navigation bar |
| 1 | `src/components/desktop/DesktopBackground.tsx` | Animated wallpaper |
| 1 | `src/lib/desktopStore.ts` | Desktop UI state (windows, icons) |
| 2 | *(TerminalEmbed lives in existing Terminal.tsx)* | |
| 3 | `src/lib/processManager.ts` | Process table and lifecycle |
| 3 | `src/lib/commands/ps.ts` | Process list |
| 3 | `src/lib/commands/kill.ts` | Send signals |
| 3 | `src/lib/commands/killall.ts` | Kill by name |
| 3 | `src/lib/commands/jobs.ts` | Background job list |
| 3 | `src/lib/commands/bg.ts` | Background resume |
| 3 | `src/lib/commands/fg.ts` | Foreground bring |
| 3 | `src/lib/commands/disown.ts` | Job removal |
| 3 | `src/lib/commands/nohup.ts` | Hangup immunity |
| 3 | `src/lib/commands/wait.ts` | Process wait |
| 4 | `src/lib/parser.ts` | Pipeline parsing |
| 4 | `src/lib/commands/grep.ts` | Pattern search (piped input) |
| 5 | `src/lib/shellAST.ts` | Shell AST types |
| 5 | `src/lib/shellParser.ts` | Shell script parser |
| 5 | `src/lib/shellExecutor.ts` | Shell AST executor |
| 5 | `src/lib/commands/source.ts` | Script execution |
| 5 | `src/lib/commands/read.ts` | Stdin read |
| 5 | `src/lib/commands/test.ts` | Condition testing |
| 5 | `src/lib/commands/exit.ts` | Shell exit |
| 5 | `src/lib/commands/return.ts` | Function return |
| 5 | `src/lib/commands/local.ts` | Local scope var |
| 5 | `src/lib/commands/alias.ts` | Command aliases |
| 6 | `src/lib/virtualFs/proc.ts` | /proc generator |
| 6 | `src/lib/virtualFs/dev.ts` | /dev device handlers |
| 6 | `src/lib/commands/chmod.ts` | File mode change |
| 6 | `src/lib/commands/chown.ts` | File owner change |
| 6 | `src/lib/commands/ln.ts` | Links |
| 6 | `src/lib/commands/stat.ts` | File metadata |
| 6 | `src/lib/commands/umask.ts` | Permission mask |
| 6 | `src/lib/commands/mount.ts` | Filesystem mount |
| 7 | `src/components/desktop/DesktopIcons.tsx` | Icon grid |
| 7 | `src/components/desktop/Window.tsx` | Draggable window frame |
| 7 | `src/components/desktop/Taskbar.tsx` | Bottom taskbar |
| 7 | `src/components/desktop/StartMenu.tsx` | Start menu |
| 7 | `src/components/desktop/FileManager.tsx` | File manager app |
| 8 | `src/lib/commands/uname.ts` | System info |
| 8 | `src/lib/commands/uptime.ts` | Uptime display |
| 8 | `src/lib/commands/date.ts` | Date/time |
| 8 | `src/lib/commands/cal.ts` | Calendar |
| 8 | `src/lib/commands/free.ts` | Memory usage |
| 8 | `src/lib/commands/lscpu.ts` | CPU info |
| 8 | `src/lib/commands/lspci.ts` | PCI devices |
| 8 | `src/lib/commands/lsblk.ts` | Block devices |
| 8 | `src/lib/commands/dmesg.ts` | Kernel messages |
| 8 | `src/lib/commands/hostname.ts` | Hostname display/set |
| 8 | `src/lib/commands/id.ts` | User/group ID |
| 8 | `src/lib/commands/df.ts` | Disk free |
| 8 | `src/lib/commands/du.ts` | Disk usage |
| 8 | `src/lib/commands/find.ts` | File search |
| 8 | `src/lib/commands/wc.ts` | Word/line/char count |
| 8 | `src/lib/commands/head.ts` | First N lines |
| 8 | `src/lib/commands/tail.ts` | Last N lines |
| 8 | `src/lib/commands/less.ts` | Pager |
| 8 | `src/lib/commands/sort.ts` | Line sort |
| 8 | `src/lib/commands/uniq.ts` | Deduplicate lines |
| 8 | `src/lib/commands/diff.ts` | File diff |
| 8 | `src/lib/commands/time.ts` | Command timer |
| 9 | `src/lib/framebuffer.ts` | Canvas drawing API |
| 9 | `src/lib/commands/fbdraw.ts` | Draw primitives |
| 9 | `src/lib/commands/fbfill.ts` | Fill canvas |
| 9 | `src/lib/commands/fbtext.ts` | Draw text |
| 9 | `src/lib/commands/fbclear.ts` | Clear canvas |
| 9 | `src/lib/commands/fbsave.ts` | Save screenshot |
| 9 | `src/lib/commands/fbview.ts` | View image |
| 10 | `src/lib/packageManager.ts` | Package registry |
| 10 | `src/lib/commands/pkg.ts` | Package commands |
| 11 | `src/lib/commands/adduser.ts` | Add user |
| 11 | `src/lib/commands/deluser.ts` | Delete user |
| 11 | `src/lib/commands/passwd.ts` | Password change |
| 11 | `src/lib/commands/su.ts` | Switch user |
| 11 | `src/lib/commands/sudo.ts` | Elevate privileges |
| 11 | `src/lib/commands/groups.ts` | Group list |
| 11 | `src/lib/commands/groupadd.ts` | Group creation |
| 11 | `src/lib/commands/groupdel.ts` | Group deletion |
| 11 | `src/lib/commands/who.ts` | Logged-in users |
| 11 | `src/lib/commands/users.ts` | Username list |
| 11 | `src/lib/commands/last.ts` | Login history |
| 11 | `src/lib/commands/write.ts` | Message user |
| 11 | `src/lib/commands/wall.ts` | Broadcast message |
| 12 | `src/lib/commands/ping.ts` | ICMP simulation |
| 12 | `src/lib/commands/netstat.ts` | Socket stats |
| 12 | `src/lib/commands/ss.ts` | Modern socket stats |
| 12 | `src/lib/commands/ifconfig.ts` | Interface config |
| 12 | `src/lib/commands/ip.ts` | Modern ip tool |
| 12 | `src/lib/commands/route.ts` | Routing table |
| 12 | `src/lib/commands/traceroute.ts` | Route tracing |
| 12 | `src/lib/commands/nslookup.ts` | DNS lookup |
| 12 | `src/lib/commands/host.ts` | Host lookup |
| 12 | `src/lib/commands/dig.ts` | Detailed DNS |
| 12 | `src/lib/commands/nc.ts` | Netcat |
| 12 | `src/lib/commands/listen.ts` | Port listener |
| 12 | `src/lib/commands/wget.ts` | HTTP download |
| 13 | `src/components/desktop/BootSequence.tsx` | Boot animation |
| 13 | `src/lib/commands/shutdown.ts` | Power off |
| 13 | `src/lib/commands/reboot.ts` | Restart |
| 13 | `src/lib/commands/halt.ts` | Halt |
| 14 | `src/lib/commands/sed.ts` | Stream editor |
| 14 | `src/lib/commands/awk.ts` | Pattern scanner |
| 14 | `src/lib/commands/tar.ts` | Archiver |
| 14 | `src/lib/commands/zip.ts` | Compressor |
| 14 | `src/lib/commands/unzip.ts` | Decompressor |
| 14 | `src/lib/commands/crontab.ts` | Scheduler |
| 14 | `src/lib/commands/at.ts` | One-time schedule |
| 14 | `src/lib/commands/make.ts` | Build system |
| 14 | `src/lib/commands/git.ts` | Version control |
| 14 | `src/lib/commands/base64.ts` | Encode/decode |
| 14 | `src/lib/commands/sha256sum.ts` | Hash |
| 14 | `src/lib/commands/md5sum.ts` | Hash |
| 14 | `src/lib/commands/patch.ts` | Diff apply |

### Modified Files

| File | Phase | Change |
|---|---|---|
| `src/routes/__root.tsx` | 1 | No change needed |
| `src/routes/index.tsx` | 1 | No change needed |
| `src/components/Terminal.tsx` | 2 | Extract TerminalEmbed, keep fullscreen wrapper |
| `src/components/TerminalInput.tsx` | 2 | No change needed |
| `src/components/TerminalOutput.tsx` | 9 | Conditionally render canvas vs lines |
| `src/lib/terminalStore.ts` | 3,4,5,6,8,9,11,12 | Add processManager, systemInfo, framebuffer, users, networkState, bootState |
| `src/lib/commands/index.ts` | 3,4,5,10 | Add & parsing, pipeline dispatch, shebang detection, dynamic registration |
| `src/lib/commands/types.ts` | 4 | Add pipedInput, pid, pipedOutput to types |
| `src/lib/fileSystem.ts` | 6 | FileNode upgrade, permission checks, virtual FS routing |
| `src/lib/server-fns.ts` | 10 | Add getPackageIndex, getPackage |
| `src/routeTree.gen.ts` | 1 | Auto-generated by TanStack Router |

---

## Object Model Evolution

```
Current terminalStore.ts:                     Future terminalStore.ts:

lines: TerminalLine[]                         lines: TerminalLine[]
history: string[]                             history: string[]
currentPath: string                           currentPath: string
fileSystem: FileSystem                        fileSystem: FileSystem
currentTheme: string                          currentTheme: string
envVars: Record<string, string>               envVars: Record<string, string>
user: string | null                           user: string | null
userInfo: UserInfo | null                     userInfo: UserInfo | null
editorOpen/editorFilePath/...                 editorOpen/editorFilePath/...
markdownOpen/markdownFilePath/...             markdownOpen/markdownFilePath/...
                                              processManager: ProcessManager       ← NEW
                                              shellPid: number                     ← NEW
                                              systemInfo: SystemInfo               ← NEW
                                              bootState: BootState                 ← NEW
                                              framebuffer: FramebufferState         ← NEW
                                              users: User[]                        ← NEW
                                              currentUid: number                   ← NEW
                                              groups: Group[]                      ← NEW
                                              networkState: NetworkState           ← NEW

NEW desktopStore.ts:

windows: WindowState[]
nextWindowId: number
nextZIndex: number
wallpaper: string
openWindow / closeWindow / minimizeWindow / restoreWindow
focusWindow / moveWindow / resizeWindow
```

---

## Route Relationship

```
┌─────────────────────────────────────┐
│          __root.tsx                  │
│  (ClerkProvider, fonts, HTML shell) │
└────────────────┬────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌───────────────┐  ┌───────────────┐  ┌────────────────┐
│  / (index.tsx) │  │ /desktop      │  │ /$pageName     │
│  Terminal     │  │ (desktop.tsx) │  │ (wwwroot page) │
│  (fullscreen) │  │ OS Environment│  │ sandbox iframe │
└───────────────┘  └───────────────┘  └────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Terminal │ │   File   │ │ Settings │
        │  Window  │ │ Manager  │ │  Window  │
        └──────────┘ └──────────┘ └──────────┘
```

**Navigation flow:**
- `/` → full-screen terminal (unchanged, instant)
- `/desktop` → boot sequence → desktop environment
- Desktop "Terminal" icon → opens terminal in a window
- Desktop "⌂" nav button → navigates to `/`
- Terminal command `desktop` → navigates to `/desktop`
- Terminal command `exit` in terminal window → closes terminal window on desktop
- `Ctrl+Alt+T` keyboard shortcut on desktop → opens new terminal window

**Link from terminal to desktop:**
- New command: `desktop` — navigates to `/desktop`
- MOTD updated to mention: "Type 'desktop' to enter the OS environment"

---

## State Sharing Architecture

```
                    ┌─────────────────────────────┐
                    │    terminalStore.ts          │
                    │  (Zustand - global state)    │
                    │                              │
                    │  fileSystem, envVars, user   │
                    │  processManager, systemInfo  │
                    │  users, networkState, ...    │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Terminal (/)    │ │ Desktop      │ │ WWWRoot      │
    │ reads state     │ │ reads state  │ │ reads FS     │
    │ writes state    │ │ writes state │ │ (read-only)  │
    └─────────────────┘ └──────────────┘ └──────────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
          ┌─────────────────┐  ┌─────────────────┐
          │ desktopStore.ts │  │  BootSequence   │
          │ (windows, icons)│  │  reads bootState │
          │ desktop state   │  │  writes bootState│
          └─────────────────┘  └─────────────────┘
```

**Key principle:** Desktop-specific UI state (window positions, open apps) lives in `desktopStore.ts`. All "system" state (filesystem, processes, users, network) lives in `terminalStore.ts`. The desktop terminal window reads from the same `terminalStore` as the full-screen terminal at `/`.

---

## Theme Compatibility

| Theme | Terminal at `/` | Desktop |
|---|---|---|
| Cyberpunk (default) | Green-on-black CRT | Green borders, Matrix wallpaper |
| Amber CRT | Amber-on-black | Amber borders, dark amber wallpaper |
| Phosphor | Green-white-on-black | White borders, subtle grid |
| Commodore 64 | Blue-on-dark-blue | Blue borders, dark pattern |
| Solarized Dark | Solarized palette | Solarized borders, warm dark bg |

Desktop windows inherit the terminal theme colors via CSS variables (already set by `Terminal.tsx`). Desktop components use a new set of CSS variables: `--color-desktop-bg`, `--color-desktop-border`, etc., which are derived from the active theme.

---

## Accessibility

| Feature | Implementation |
|---|---|
| Skip boot animation | `Ctrl+C` or click during boot |
| Keyboard navigation | `Alt+F4` close window, `Alt+Tab` switch windows, `Ctrl+Alt+T` new terminal |
| Focus management | Windows trap focus when active; Tab cycles within window |
| Screen reader | ARIA labels on windows, icons, buttons |
| Reduced motion | `prefers-reduced-motion` media query disables boot animation |

---

## Future Extensions (Beyond This Plan)

- **Real-time multi-user** — shared desktop sessions via WebSocket
- **Cloud sync** — full desktop state synced between devices
- **Plugin SDK** — third-party window apps
- **VM simulation** — nested terminal-in-terminal with separate kernel
- **File system snapshots** — undo/redo for FS operations
- **Desktop widgets** — clock, CPU meter, weather on desktop
- **Sound system** — beep, bell, startup chime

---

## Status

**Status:** 📝 Planned — phased implementation, starting with Phase 1 (Desktop route scaffold).

---

## Related Documents

- [P001-implementation.md](P001-implementation.md) — Original terminal implementation
- [P011-wwwroot-pages.md](P011-wwwroot-pages.md) — Virtual web page hosting
- [F002-pipes-redirects.md](future/F002-pipes-redirects.md) — Pipes and redirects
- [F004-terminal-games.md](future/F004-terminal-games.md) — Terminal games (can use framebuffer)
- [F008-api-routes.md](future/F008-api-routes.md) — API routes (network layer)
