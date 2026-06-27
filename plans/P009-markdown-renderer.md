# Implementation Plan: Markdown Renderer Command (`md`)

This document details the implementation of a dedicated markdown renderer command that opens a modal overlay displaying parsed markdown content with terminal-native styling.

---

## Overview

The `md <file>` command reads a markdown file from the simulated filesystem and renders it in a dedicated modal view. The renderer uses a custom DIY parser (no external dependencies) that emits React elements directly, eliminating XSS risk. The modal follows the same architectural pattern as the existing `edit` command's text editor modal.

**Architecture Pattern:** Handler + Effect (mirrors `edit` command exactly)

---

## Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Modal overlay** instead of inline scrollback | Keeps terminal output stream clean; follows established `edit` modal pattern |
| 2 | **DIY custom parser** instead of external library | Maintains cyberpunk "hand-built" aesthetic; zero bundle bloat; keeps dependency count minimal |
| 3 | **Mix styling** — semantic HTML with terminal theme colors | Headers get terminal-green bold with subtle borders, not browser-default sizing. Body uses monospace font. Bold gets `terminal-glow`. Italic gets cyan. Code gets yellow. |
| 4 | **Dedicated modal view** separate from output stream | Modal opens above terminal, doesn't pollute scrollback history |
| 5 | `cat` stays raw | `md` is a separate tool, consistent with real Unix philosophy |
| 6 | **Safe by construction** — parser emits React elements | Zero `dangerouslySetInnerHTML`, no XSS surface |
| 7 | **No TerminalLine changes** | Modal bypasses the output line system entirely |
| 8 | **Handler + Effect pattern** | Follows existing command registration convention |

---

## Micro-Decisions

| # | Decision | Rationale |
|---|---|---|
| A | No syntax highlighting in code blocks | DIY parser scope stays minimal; plain monospace is terminal-appropriate |
| B | Links `[text](url)` rendered as underlined text + URL in parens, non-clickable | Preserves terminal illusion; no unexpected navigation |
| C | Images `![alt](url)` displayed inline via `<img>` | Attempts to render; broken images show `[IMAGE FAILED: alt]` placeholder |
| D | Modals do not overlap | `editorOpen` and `markdownOpen` are independent store flags. Each modal is `z-50` fixed overlay. Second modal covers first visually. Both close independently via Esc. |

---

## Files to Create

### 1. `src/lib/markdownParser.ts` — DIY Markdown Parser

**Algorithm**: Two-pass parser operating on raw lines.

- **Pass 1**: Split input by newlines. Identify block boundaries (fenced code blocks delimited by ` ``` `, everything else by blank lines).
- **Pass 2**: For each block, determine type by prefix:
  - `### ` → `h3`, `## ` → `h2`, `# ` → `h1`
  - ` ``` ` → `pre` (preserve indentation, no inline formatting inside)
  - `> ` → `blockquote`
  - `- ` or `* ` → `ul` (group consecutive list items into single `<ul>`)
  - `---` → `hr` (only when line is exactly `---`)
  - blank → skip
  - default → `p`

**Inline formatting within non-code blocks** (processed left-to-right):
- `**text**` → `<strong>`
- `*text*` or `_text_` → `<em>`
- `` `text` `` → `<code>`
- `[text](url)` → `<span className="underline">text</span> <span>(url)</span>`
- `![alt](url)` → `<img src={url} alt={alt}>` with `maxWidth: 100%`, `display: block`, and error fallback

**Return type**: `React.ReactNode[]` — array of block-level elements.

**Styling map** (all using Tailwind classes referencing CSS custom properties):

| Element | Tailwind Classes |
|---|---|
| `<h1>` | `text-terminal-green text-xl font-bold mt-4 mb-2 border-b` |
| `<h2>` | `text-terminal-green text-lg font-bold mt-3 mb-2 border-b` |
| `<h3>` | `text-terminal-green text-base font-bold mt-2 mb-1` |
| `<p>` | `text-terminal-green-dark mb-3 leading-relaxed` |
| `<strong>` | `text-terminal-green font-bold terminal-glow` |
| `<em>` | `text-terminal-cyan italic` |
| `<code>` (inline) | `text-terminal-yellow bg-terminal-bg px-1 rounded` |
| `<pre>` | `bg-terminal-bg/50 p-3 rounded mb-3 overflow-x-auto terminal-scrollbar` |
| `<blockquote>` | `border-l-2 border-terminal-green/30 pl-3 text-terminal-green-dark italic mb-3` |
| `<ul>` | `text-terminal-green-dark mb-3 ml-4 list-disc` |
| `<li>` | `mb-1` |
| `<hr>` | `border-terminal-green/30 my-4` |
| `<img>` | `max-w-full h-auto my-2 block border border-terminal-green/20` |
| `<span>` link text | `text-terminal-cyan underline cursor-default` |

**Edge cases**:
- Empty file → render empty body (no error)
- No blank line before header → header wins, closes previous block
- Code block without closing ` ``` ` → treat rest of file as code
- Nested formatting `**bold inside *italic***` → process left-to-right: bold first, then italic in remaining
- Multi-line list items → each line starting with `- ` is a new `<li>` inside grouped `<ul>`
- Mixed `---` inside text → only horizontal rule when line is exactly `---`

---

### 2. `src/components/MarkdownModal.tsx` — Markdown Modal Component

Structure mirrors `EditorModal.tsx` but with read-only content.

**Layout**:
- Fixed overlay: `fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm`
- Container: `flex flex-col w-[90vw] h-[85vh] max-w-4xl bg-terminal-bg border-2 rounded-lg overflow-hidden`
  - Border color: `color-mix(in srgb, var(--color-terminal-green) 30%, transparent)`
  - Box shadow: `0 0 30px color-mix(in srgb, var(--color-terminal-green) 15%, transparent)`
- Header: `MARKDOWN: {filename}` + full path, same styling as `EditorModal`
  - Border bottom: `color-mix(in srgb, var(--color-terminal-green) 20%, transparent)`
- Body: `flex-1 overflow-y-auto p-4 terminal-scrollbar font-mono text-sm terminal-glow`
- Footer: `[Esc] Close` with same shortcut styling as `EditorModal`

**Key differences from `EditorModal`**:
- No `<textarea>` — uses a `<div>` containing parsed React nodes from `markdownParser()`
- No `Ctrl+S` handler
- No editable state
- Image errors display `[IMAGE FAILED: alt]` placeholder text
- `Escape` key and overlay click call `closeMarkdown()`

---

### 3. `src/lib/commands/md.ts` — Command Handler & Effect

```ts
export const MANUAL = 'md\n\nRender markdown file contents as formatted HTML.\n\nUsage: md <file>'
export const HELP_TEXT = '  md <file>            Render markdown file'
```

**Handler logic**:
1. Validate `args.length > 0` → error: `md: missing file operand`
2. Resolve path via `context.fileSystem.resolvePath(args[0], context.currentPath)`
3. Check entry type → if directory: `md: ${args[0]}: Is a directory`
4. Read file content → if missing: `md: ${args[0]}: No such file or directory`
5. Return `success: true` with `data: { markdownFilePath: resolved, markdownContent: content }`

**Effect logic**:
- If `result.success && result.data?.markdownFilePath !== undefined`:
  - Call `context.openMarkdown(result.data.markdownFilePath, result.data.markdownContent || '')`
  - Return `'handled'`
- Otherwise return `'continue'`

---

## Files to Modify

### 4. `src/lib/terminalStore.ts` — Add Markdown State & Actions

**Add to `TerminalState` type**:
```ts
markdownOpen: boolean
markdownFilePath: string | null
markdownContent: string | null
openMarkdown: (filePath: string, content: string) => void
closeMarkdown: () => void
```

**Add to initial state**:
```ts
markdownOpen: false,
markdownFilePath: null,
markdownContent: null,
```

**Add `openMarkdown` action**:
```ts
openMarkdown: (filePath: string, content: string) => {
  set({
    markdownOpen: true,
    markdownFilePath: filePath,
    markdownContent: content,
  })
}
```

**Add `closeMarkdown` action**:
```ts
closeMarkdown: () => {
  set({
    markdownOpen: false,
    markdownFilePath: null,
    markdownContent: null,
  })
  get().addLine({ type: 'prompt', content: get().getPrompt() })
}
```

---

### 5. `src/lib/commands/types.ts` — Extend CommandEffectContext

**Add to `CommandEffectContext`** interface:
```ts
openMarkdown: (filePath: string, content: string) => void
closeMarkdown: () => void
```

---

### 6. `src/lib/commands/index.ts` — Register Command

**Add import**:
```ts
import { handler as mdHandler, effect as mdEffect } from './md'
```

**Add to `commands` registry**:
```ts
md: mdHandler,
```

**Add to `commandEffects` registry**:
```ts
md: mdEffect,
```

---

### 7. `src/components/Terminal.tsx` — Render Modal

**Add import**:
```ts
import { MarkdownModal } from './MarkdownModal'
```

**Add component** after `<EditorModal />`:
```tsx
<MarkdownModal />
```

---

### 8. `src/lib/commands/help.ts` — Add Help Text

**Add import**:
```ts
import { HELP_TEXT as mdHelp } from './md'
```

**Add to output array** in "File System Commands" section:
```ts
mdHelp,
```

---

### 9. `src/lib/commands/man.ts` — Add Manual Page

**Add import**:
```ts
import { MANUAL as mdManual } from './md'
```

**Add to `manPages` registry**:
```ts
md: mdManual,
```

---

## Testing Checklist

1. `md README.md` on a real markdown file → opens modal, renders headers/bold/italic/lists/code blocks correctly
2. `md` (no args) → error: `md: missing file operand`
3. `md dir/` → error: `md: dir/: Is a directory`
4. `md nonexistent` → error: `md: nonexistent: No such file or directory`
5. `cat README.md` → still shows raw markdown in terminal
6. Press `Esc` in modal → modal closes, prompt returns
7. Click overlay → modal closes
8. `help` → shows `md` in list
9. `man md` → shows manual page
10. Image in markdown → renders inline, broken images show placeholder
11. Theme switch while modal open → modal picks up new theme colors
12. Fenced code block preserves indentation and is not parsed for inline formatting
13. Horizontal rule `---` renders correctly
14. Blockquote `> text` renders with left border

---

## Status

**Status:** 📝 Planned — implementation pending.

---

## Related Documents

- [P004-text-editor-modal.md](P004-text-editor-modal.md) — Established the handler+effect modal pattern that `md` follows
- [P008-themes.md](P008-themes.md) — Theme system that `MarkdownModal` inherits styling from
