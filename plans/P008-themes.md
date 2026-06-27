# P008 — Theme System

Add a fixed/static set of terminal color themes, selectable via a `theme <name>` command. The current cyberpunk green-on-black palette remains the default. The selected theme persists in `localStorage` across reloads. The `reset` command does NOT reset the theme choice.

**Status:** 📝 Planned

---

## Motivation

The terminal currently ships with a single cyberpunk green-on-black look. A `theme` command lets users switch to classic retro palettes (amber CRT, phosphor, C64, solarized) for variety and accessibility — all while keeping the existing neon-glow aesthetic architecture.

---

## Goals

1. Static theme palette — no custom user-defined themes.
2. Default theme on first load is the current cyberpunk palette.
3. `theme` command lists available themes.
4. `theme <name>` switches the palette instantly.
5. Theme persists in `localStorage`; survives reloads.
6. `reset` does NOT touch the stored theme.
7. No flash of wrong theme on initial load.

---

## Architecture

### Theme Definition (`src/lib/themes.ts`)

```typescript
type Theme = {
  name: string           // kebab-case id, e.g. 'cyberpunk'
  label: string          // human label, e.g. 'Cyberpunk'
  colors: {
    bg: string           // background
    text: string         // primary text
    textDim: string      // dim/secondary text
    textDark: string     // prompt path / separators
    error: string        // error messages
    blue: string         // directory names / links
    yellow: string       // system messages
    cyan: string         // accents
    magenta: string      // accents
  }
}
```

All theme values are hex colors. Glow and alpha variants are computed at runtime via `color-mix()` in CSS so themes don't need to declare raw rgba strings.

### Theme Registry (5 themes)

| Name | Label | Description |
|------|-------|-------------|
| `cyberpunk` | Cyberpunk | Current default — black bg, bright green text, red errors |
| `amber` | Amber CRT | Monochrome amber — dark bg, amber/orange text |
| `phosphor` | Phosphor | IBM P70 white phosphor — dark bg, cyan/white text |
| `commodore` | Commodore 64 | C64 — dark blue bg, light blue text |
| `solarized` | Solarized Dark | Muted teal/blue palette |

Adding a new theme later = adding one object to the registry array.

### CSS Changes (`src/styles/terminal.css`)

Tailwind v4 `@theme` tokens already map to CSS custom properties (`--color-terminal-*`). We will:

1. Keep the `@theme` block but remove hardcoded defaults from `body`.
2. Replace all raw hex values in `body`, keyframes, `.terminal-cursor`, `.terminal-glow`, `.terminal-glow-red`, `.terminal-scanlines`, `.terminal-scrollbar`, and `.terminal-input:focus` with `var(--color-terminal-*)` references.
3. Use `color-mix(in srgb, var(--color-terminal-green) 50%, transparent)` instead of `rgba(...)` in text-shadows so every theme's glow auto-derives.
4. Keep a `:root` fallback with the cyberpunk palette so the page renders correctly even before React hydrates.

### Theme Application (`src/components/Terminal.tsx`)

The `Terminal` component reads `currentTheme` from the Zustand store and applies all color variables as an inline `style` object on the root wrapper `<div>`:

```tsx
style={{
  '--color-terminal-bg': theme.colors.bg,
  '--color-terminal-text': theme.colors.text,
  // ... etc
}}
```

This overrides the `:root` fallback immediately on first render.

### No-Flash Hydration (`index.html`)

To prevent the default cyberpunk colors from flashing before React loads, add a small inline `<script>` in `index.html` that:

1. Reads `localStorage` key `ci-simulator:theme`.
2. If a saved theme exists, writes all `--color-terminal-*` variables to `document.documentElement.style`.

This runs before the React bundle executes.

### Zustand Store Changes (`src/lib/terminalStore.ts`)

Add to `TerminalState`:

```typescript
type TerminalState = {
  // ... existing fields
  currentTheme: string
  setTheme: (name: string) => void
}
```

- `currentTheme` defaults to `'cyberpunk'`.
- `setTheme(name)` validates against the registry; if valid, updates state and writes to `localStorage` key `ci-simulator:theme`.
- `initialize()` now also reads the saved theme and restores it.

### New Command: `theme` (`src/lib/commands/theme.ts`)

```
$ theme
Available themes:
  * cyberpunk    Cyberpunk — black bg, bright green text
    amber        Amber CRT — dark bg, amber text
    phosphor     Phosphor — dark bg, cyan/white text
    commodore    Commodore 64 — dark blue bg, light blue text
    solarized    Solarized Dark — muted teal/blue

$ theme amber
Theme changed to: Amber CRT

$ theme invalid
Error: unknown theme "invalid"
Available themes: cyberpunk, amber, phosphor, commodore, solarized
```

- `theme` with no args prints the list, marking the current theme with `*`.
- `theme <name>` validates, calls `context.setTheme`, and prints confirmation.
- `theme <invalid>` prints an error + available names.

### Command Registry Updates

- `src/lib/commands/index.ts` — register `theme` handler.
- `src/lib/commands/help.ts` — add `theme` to help output: `theme <name> Switch color theme`.

### Component Tweaks

- `src/components/TerminalInput.tsx` — change `caretColor: '#00ff00'` to `caretColor: 'var(--color-terminal-green)'` so it follows the theme.
- `src/components/Terminal.tsx` — update the vignette radial gradient to use a theme-aware color variable instead of hardcoded `rgba(0, 255, 0, 0.03)`.

---

## Implementation Order

1. `src/lib/themes.ts` — theme definitions and registry.
2. `src/styles/terminal.css` — replace hardcoded colors with CSS variables and `color-mix()`.
3. `src/lib/terminalStore.ts` — add `currentTheme` state, `setTheme`, and persistence in `initialize()`.
4. `src/lib/commands/theme.ts` — `theme` command handler.
5. `src/lib/commands/index.ts` — register `theme`.
6. `src/lib/commands/help.ts` — add `theme` help line.
7. `src/components/Terminal.tsx` — apply theme variables inline + update vignette.
8. `src/components/TerminalInput.tsx` — dynamic caret color.
9. `index.html` — no-flash hydration script.

---

## Acceptance Criteria

- [ ] `theme` with no args prints all 5 themes, current one marked `*`.
- [ ] `theme amber` switches the terminal to amber CRT colors instantly.
- [ ] `theme invalid` prints an error and lists valid names.
- [ ] After switching, refreshing the page keeps the selected theme.
- [ ] `reset` clears filesystem but does NOT revert the theme.
- [ ] No color flash on initial page load when a non-default theme is saved.
- [ ] All existing terminal features (commands, glow, scanlines, scrollbar) work in every theme.

---

## Notes

- `color-mix()` is supported in all modern browsers (Chrome 111+, Firefox 113+, Safari 16+). Since the project uses Tailwind v4 and modern Vite, this is safe.
- The vignette and scanline overlays use very low alpha values, so they should look correct across dark backgrounds without per-theme tweaking.
- Future: if we ever want user-defined themes, the architecture already supports it — just add a UI for creating `Theme` objects and store them in `localStorage`.
