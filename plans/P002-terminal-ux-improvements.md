# Implementation Plan: Terminal UX Improvements

This document details the visual and interaction refinements to the terminal simulator. Each task targets a specific UX issue with exact file changes.

---

## Task 1: Remove Browser Focus Ring on Input

**Goal:** Eliminate the default browser outline/ring when the input is focused, replacing it with a subtle terminal glow.

**Status:** ⬜ PENDING

**Implementation:** `src/components/TerminalInput.tsx`, `src/styles/terminal.css`

**Notes:**
- Input currently has `outline-none border-none` but browsers can still render a focus ring via `box-shadow` or `ring`
- Add `ring-0 focus:ring-0 focus:outline-none terminal-input` to the `<input>` className
- Add `.terminal-input:focus` CSS rule that sets `outline: none`, `box-shadow: none`, and a subtle green `text-shadow`
- The blinking cursor remains the primary focus indicator

**Deliverable:** Input has no browser focus ring; only cursor and glow are visible.

---

## Task 2: Always Auto-Focus Input

**Goal:** Ensure the input regains focus automatically when the user returns from another browser tab.

**Status:** ⬜ PENDING

**Implementation:** `src/components/TerminalInput.tsx`

**Notes:**
- Existing mount effect (`useEffect` with `setTimeout(..., 50)`) handles initial focus
- Existing click listener on `terminalRef` handles clicks inside the terminal
- Add a new `useEffect` that listens to `window.addEventListener('focus', ...)` and calls `inputRef.current?.focus()`
- Clean up listener on unmount
- Do not steal focus from other page UI elements; only restore when the window itself regains focus

**Deliverable:** Input is focused on mount, on click inside terminal, and when returning from another browser tab.

---

## Task 3: Padding Between Window Border and CLI Content

**Goal:** Prevent text and prompts from hugging the inner green border of the terminal frame.

**Status:** ⬜ PENDING

**Implementation:** `src/components/Terminal.tsx`

**Notes:**
- Current outer container has `p-10` (frame padding) and inner box has `p-5`, but the flex child holding output/input has no inset
- Restructure `Terminal.tsx` inner layout:
  - Outer bordered box: keep `p-5` removed, let children handle inset
  - Output wrapper: `flex-1 overflow-hidden min-h-0 p-4 pb-2`
  - Input wrapper: `shrink-0 w-full p-4 pt-2`
- This creates uniform breathing room between the green border and all rendered content
- `TerminalInput.tsx` internal padding adjusted to avoid doubling up with parent padding

**Deliverable:** Visible gap between green border and first line of text/output.

---

## Task 4: Visual Difference Between User Input and Printed Result

**Goal:** Make prompt lines and command outputs visually distinct so users can easily scan command sessions.

**Status:** ⬜ PENDING

**Implementation:** `src/components/TerminalOutput.tsx`

**Notes:**
- Currently all lines except errors/system are `text-terminal-green`
- Update `TerminalOutput.tsx` line type class mapping:
  - `prompt` → `text-terminal-green font-bold mb-1`
  - `output` → `text-terminal-green-dim`
  - `error` → `text-terminal-red terminal-glow-red` (unchanged)
  - `system` → `text-terminal-yellow` (unchanged)
- The `mb-1` on prompts adds a small gap before the output block, improving scannability
- `TerminalInput.tsx` prompt prefix already uses `font-bold`, so it visually matches output prompts

**Deliverable:** Prompts are bright bold green; command outputs are dimmer green; clear visual separation between sessions.

---

## Task 5: Scroll When Content Exceeds Window

**Goal:** Ensure the output area properly scrolls when content overflows, while the input stays fixed at the bottom.

**Status:** ⬜ PENDING

**Implementation:** `src/components/Terminal.tsx`, `src/components/TerminalOutput.tsx`

**Notes:**
- `TerminalOutput.tsx` already has `overflow-y-auto` and auto-scroll `useEffect`
- The issue is likely that the output container does not fill its flex parent height, so overflow never triggers
- Add `h-full` to `TerminalOutput.tsx`'s root div className so it fills the flex parent
- Simplify `Terminal.tsx` output wrapper to `flex-1 overflow-hidden min-h-0` (remove nested `flex flex-col` that may interfere)
- Auto-scroll behavior already implemented via `scrollRef` and `scrollTop = scrollHeight` on `lines` change

**Deliverable:** Long outputs scroll vertically; input remains pinned at bottom; view auto-scrolls to newest line.

---

## Task 6: Input Stuck to Bottom

**Goal:** Guarantee the input bar never gets pushed up or clipped, regardless of output volume.

**Status:** ⬜ PENDING

**Implementation:** `src/components/Terminal.tsx`

**Notes:**
- Input already uses `shrink-0` which prevents flex shrinking
- Combined with Task 5 scroll fix, the input stays anchored naturally
- Verify that the input wrapper in `Terminal.tsx` does not get `overflow-hidden` or `flex-1` accidentally
- Keep `shrink-0 w-full` on the input container; parent handles padding

**Deliverable:** Input bar is permanently visible at the bottom of the terminal frame.

---

## Task 7: Responsive Padding (Bonus)

**Goal:** Make the outer terminal frame padding adapt to screen size so mobile isn't cramped.

**Status:** ⬜ PENDING

**Implementation:** `src/components/Terminal.tsx`

**Notes:**
- Current outer container uses fixed `p-10`
- Replace with responsive Tailwind classes: `p-4 md:p-8 lg:p-10`
  - Mobile (`<768px`): `16px` padding
  - Tablet (`md:`): `32px` padding
  - Desktop (`lg:`): `40px` padding
- Inner content padding from Task 3 remains constant (`p-4`) regardless of screen size

**Deliverable:** Comfortable frame padding on all screen sizes.

---

## Build Checklist

- [ ] Task 1: Remove Browser Focus Ring on Input
- [ ] Task 2: Always Auto-Focus Input
- [ ] Task 3: Padding Between Window Border and CLI Content
- [ ] Task 4: Visual Difference Between User Input and Printed Result
- [ ] Task 5: Scroll When Content Exceeds Window
- [ ] Task 6: Input Stuck to Bottom
- [ ] Task 7: Responsive Padding (Bonus)

---

## Files Modified

| File | Tasks | Changes |
|------|-------|---------|
| `src/components/Terminal.tsx` | 3, 5, 6, 7 | Layout restructuring, responsive padding |
| `src/components/TerminalInput.tsx` | 1, 2 | Focus ring removal, window focus listener |
| `src/components/TerminalOutput.tsx` | 4, 5 | Color differentiation, `h-full` for scroll |
| `src/styles/terminal.css` | 1 | `.terminal-input:focus` rule |

---

## Constraints

- No changes to `src/lib/terminalStore.ts`, `src/lib/commands.ts`, or `src/lib/fileSystem.ts`
- No changes to command execution behavior or prompt format
- All styling uses Tailwind utility classes or existing CSS custom classes
- CRT/scanline overlay remains untouched
- TypeScript types preserved

---

## Verification Steps

1. Click into terminal — input focused, no browser ring
2. Switch browser tab and return — input re-focused automatically
3. Type `ls` or `cat /etc/motd` — prompt is bright bold green, output is dimmer green
4. Run a command that prints 50+ lines — output scrolls, input stays at bottom
5. Resize browser to mobile width — outer padding reduces, content still readable
6. Check that text never touches the inner green border frame

---

## Notes

- The input focus ring removal intentionally does not add an accessible focus indicator alternative; the blinking cursor and green glow serve that purpose in this terminal aesthetic.
- Window focus restoration only triggers when the entire browser window regains focus, not on every re-render.
- `text-terminal-green-dim` token (`#00cc00`) is already defined in `terminal.css` and used for output differentiation.
