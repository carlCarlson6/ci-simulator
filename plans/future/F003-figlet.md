# Implementation Plan: `figlet` — ASCII Block Letters

**Goal:** Add a `figlet` command that renders input text as large ASCII block letters directly in the terminal output.

**Status:** 📝 Planned

---

## Overview

A lightweight, bundled figlet-like renderer that converts text to ASCII art using a built-in font. No external dependency — ships a small bitmap font as a TypeScript constant and renders each character by reading a grid of rows. Output is printed to terminal output lines.

**Architecture Pattern:** New command handler with embedded font data.

---

## Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Bundle one font as a TypeScript constant** | Zero runtime dependencies; keeps the cyberpunk "hand-built" ethos |
| 2 | **Font: a simplified "standard" or "big" style** | Most recognizable figlet font, 8-10 rows tall |
| 3 | **Only uppercase letters, digits, and basic punctuation** | Keeps font data small (~5KB); lowercase renders as uppercase |
| 4 | **Command accepts text as arguments** (`figlet hello`) | Standard figlet usage |
| 5 | **Output as terminal lines** (not a modal) | Consistent with `cowsay` pattern |
| 6 | **Support `-f <font>` flag for future fonts** | Prepare for font selection even if only one font shipped initially |

---

## Micro-Decisions

| # | Decision | Rationale |
|---|---|---|
| A | Font data format: `Record<string, string[]>` where key is char and value is array of rows | Easy to render: transpose columns → concatenate → join rows |
| B | Max width: no hard limit; text wraps to terminal width? No — horizontal scroll on long lines | Figlet output is typically not wrapped |
| C | Empty input: `figlet` with no args → show usage | No error, prints usage |
| D | Multi-word: `figlet hello world` → render all words separated by 3 spaces of padding | Matches real figlet |
| E | Color: use current terminal primary color (`text-terminal-green`) | Matches theme system |

---

## Files to Create

### 1. `src/lib/commands/figlet.ts` — Command handler + font data

**Font data structure** (embedded in the same file):
```ts
const FONT: Record<string, string[]> = {
  'A': [
    '  █████  ',
    ' ██   ██ ',
    ' ███████ ',
    ' ██   ██ ',
    ' ██   ██ ',
  ],
  // ... all letters, digits, space, basic punctuation
}
```

**Handler logic**:
1. If no args → return usage: `Usage: figlet <text>`
2. Join all args with space
3. Convert to uppercase
4. For each character, look up font data (skip unsupported chars with a space placeholder)
5. Build output lines by transposing: for row 0..N, concatenate row[char] for each char
6. Return output lines

```ts
export const MANUAL = 'figlet\n\nDisplay large ASCII text banners.\n\nUsage: figlet <text>'
export const HELP_TEXT = '  figlet <text>          Display ASCII banner text'
```

---

## Files to Modify

### 2. `src/lib/commands/index.ts` — Register command

Add `figlet` to the commands registry.

### 3. `src/lib/commands/help.ts` — Add help text

### 4. `src/lib/commands/man.ts` — Add manual page

---

## Testing Checklist

1. `figlet hello` → renders "HELLO" in ASCII art
2. `figlet` (no args) → shows usage
3. `figlet HELLO WORLD` → multi-word rendering
4. `figlet 123` → digits render correctly
5. `figlet hi!` → punctuation handled
6. Works with active theme (color adapts)
7. Output scrollable in terminal output area

---

## Status

**Status:** 📝 Planned — not yet implemented.

---

## Related Documents

- [P003-quick-win-commands.md](../P003-quick-win-commands.md) — Companion to `cowsay` as ASCII art commands
