# Implementation Plan: Environment Variables (`env`, `export`, `echo $VAR`)

**Goal:** Add environment variable support to the simulated terminal — `env` to list, `export` to set, `echo $VAR` to interpolate variables in arguments.

**Status:** 📝 Planned

---

## Overview

Environment variables live in a flat `Record<string, string>` map stored in the Zustand terminal store. The `export` command sets variables, `env` lists them, and the command parsing layer expands `$VAR` and `${VAR}` syntax before dispatching to command handlers.

**Architecture Pattern:** Store state + parser layer + two new commands.

---

## Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Store env vars in Zustand**, separate from filesystem | Env vars are session-level state, not files; conceptually distinct |
| 2 | **Expand variables at parse time** (before handler dispatch) | All commands transparently see expanded values; no per-command opt-in needed |
| 3 | **`echo $VAR` handled by existing `echo` command** | Works automatically once variable expansion is in the parsing layer |
| 4 | **No `.env` file loading** | Keep scope minimal; env vars are set interactively via `export` |
| 5 | **No `source` or script loading** | Out of scope for this phase |

---

## Micro-Decisions

| # | Decision | Rationale |
|---|---|---|
| A | `export FOO=bar` with no value sets `FOO=""` | Matches real shell semantics |
| B | `export FOO` (no `=`) when `FOO` is unset → no-op | Real bash would export an empty value from the real env; here it sets to `""` |
| C | `$UNDEFINED_VAR` expands to empty string | Matches shell behavior |
| D | `${VAR:-default}` syntax out of scope | Keep expansion simple for initial implementation |
| E | `env` output format: `VAR=value` per line, sorted alphabetically | Readable and grep-able |
| F | Variable expansion also applies inside single-quoted strings? No — only double-quoted. But terminal has no quote tracking yet, so will expand everywhere for now. | Future: add quote-aware parsing |

---

## Files to Modify

### 1. `src/lib/terminalStore.ts` — Add Env Vars State

**Add to `TerminalState` type**:
```ts
envVars: Record<string, string>
setEnvVar: (key: string, value: string) => void
```

**Add to initial state**:
```ts
envVars: {},
```

**Add actions**:
```ts
setEnvVar: (key: string, value: string) =>
  set(state => ({ envVars: { ...state.envVars, [key]: value } })),
```

---

### 2. `src/lib/commands/types.ts` — Expose env vars in context

**Add to `CommandEffectContext`**:
```ts
envVars: Record<string, string>
setEnvVar: (key: string, value: string) => void
```

---

### 3. `src/lib/commands/index.ts` — Variable expansion layer

**Add a `expandVariables(input: string, envVars: Record<string, string>): string`** function and call it on the raw input string before splitting into args (or after splitting — decide based on how `echo` should work: `echo $HOME` should expand before echo sees it).

Better approach: expand **after** splitting by first space (command name shouldn't expand), then expand each arg token.

For `echo $VAR`:
- Raw input: `"echo $HOME"`
- Split: `["echo", "$HOME"]`
- Expand: `["echo", "/home/user"]`
- Dispatch to `echo` handler with args: `["/home/user"]`

---

### 4. `src/lib/commands/export.ts` — New command

**Handler logic**:
1. Parse each arg: `KEY=VALUE` or `KEY` (bare key sets empty string)
2. Call `context.setEnvVar(key, value)` for each
3. Output nothing on success (silent, like real `export`)

```ts
export const MANUAL = 'export\n\nSet environment variables.\n\nUsage: export KEY=VALUE [...]'
export const HELP_TEXT = '  export KEY=VALUE [...]   Set environment variable'
```

---

### 5. `src/lib/commands/env.ts` — New command

**Handler logic**:
1. Sort `Object.entries(context.envVars)` alphabetically by key
2. Return lines: `KEY=value`

```ts
export const MANUAL = 'env\n\nDisplay all environment variables.\n\nUsage: env'
export const HELP_TEXT = '  env                     Display environment variables'
```

---

### 6. `src/lib/commands/echo.ts` — Modify to handle `$VAR` (if not done at parse layer)

If variable expansion is done at parse layer in `index.ts`, `echo` needs no changes.

---

### 7. `src/lib/commands/help.ts` — Add help text entries

Add lines for `export` and `env`.

---

### 8. `src/lib/commands/man.ts` — Add manual page entries

Add entries for `export` and `env`.

---

## Testing Checklist

1. `export FOO=bar` → no output, `echo $FOO` → `bar`
2. `env` → shows all set variables including `FOO=bar`
3. `echo $UNDEFINED` → empty line
4. `export FOO=bar BAZ=qux` — multiple vars in one command
5. `export FOO` (no value) → `FOO=""`
6. Existing commands are not broken by variable expansion (e.g. `ls $UNDEFINED` should behave as `ls` with no path argument)

---

## Status

**Status:** 🚧 In Progress — being implemented.

---

## Related Documents

- [F002-pipes-redirects.md](future/F002-pipes-redirects.md) — Pipes would benefit from env vars for data flow
