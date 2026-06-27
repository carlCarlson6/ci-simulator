# Implementation Plan: Pipes and Redirects (`|`, `>`, `>>`)

**Goal:** Implement Unix-style pipes and output redirection — `|` to pipe command output to another command's input, `>` and `>>` to redirect output to files.

**Status:** 📝 Planned

---

## Overview

This is the most architecturally significant feature remaining. It requires teaching the command pipeline about: (1) parsing `|`, `>`, `>>` operators, (2) routing output between commands instead of only to the terminal, and (3) writing output to files. The terminal's current architecture assumes each command produces output lines independently; pipes break that assumption by requiring the left command's output to become input for the right command.

**Architecture Pattern:** Shell-like pipeline execution in the parse/dispatch layer.

---

## Decision Log

| # | Decision | Rationale |
|---|---|---|
| 1 | **Parse operators at the command line parsing stage** (in `index.ts` or a new `parser.ts`) | Keeps command handlers pure; they don't know about pipes |
| 2 | **Pipeline as sequence of commands** — split on `\|`, evaluate left-to-right, each receives previous stdout | Matches Unix semantics |
| 3 | **Redirects (`>`, `>>`) handled at the output level** — capture output lines and write to file | Works naturally after command produces output |
| 4 | **Stderr (`2>`, `2>&1`) out of scope** for initial implementation | Keep scope narrow |
| 5 | **Command handlers return structured output** that can be captured, not just terminal lines | Already partially true — `CommandResult` has `output` field |

---

## Micro-Decisions

| # | Decision | Rationale |
|---|---|---|
| A | Pipe delimiter `|` must be space-separated or adjacent (`ls|grep foo`) | Support both; strip whitespace around `\|` in parser |
| B | Only the **last** command's output goes to terminal (or to file if redirected) | Matches real shell behavior |
| C | Intermediate command failures stop the pipeline | Left-to-right evaluation; if `cmd1` fails, `cmd2` doesn't run |
| D | `>` creates file if missing, overwrites if exists | Standard Unix semantics |
| E | `>>` creates file if missing, appends if exists | Standard Unix semantics |
| F | No `|&` (pipe stderr) support | Out of scope |
| G | No heredoc (`<<`) support | Out of scope |

---

## Files to Create

### 1. `src/lib/parser.ts` — Command line parser

**Responsibilities**:
1. Tokenize the raw input string into segments separated by `|`, `>`, `>>`
2. Return a pipeline structure:

```ts
type PipelineStage = {
  command: string
  args: string[]
}

type Redirect = {
  target: 'file'
  mode: 'overwrite' | 'append'
  path: string
}

type ParsedPipeline = {
  stages: PipelineStage[]
  redirect: Redirect | null
  redirectStderr: Redirect | null  // future
}
```

**Parsing algorithm**:
1. Split on `|` not inside quotes (future: track quote state)
2. For the last segment (or any segment with `>`), check for `>> path` or `> path`
3. Strip redirect tokens from the command args
4. Return the structure

---

## Files to Modify

### 2. `src/lib/commands/index.ts` — Pipeline execution

**Core change**: Instead of `dispatch(command, args)` directly:

1. Call `parsePipeline(input)`
2. If pipeline has 1 stage and no redirect → execute as normal (current path)
3. If pipeline has multiple stages → execute sequentially:
   - Run stage 1, capture its output lines
   - Feed output lines as args to stage 2 (or as stdin — decide per command)
   - Continue until last stage
4. If redirect → capture output of last stage, write to file via `fileSystem.writeFile()`

**Command compatibility layer**:
- Commands that read from "stdin" (like `grep`) need a way to receive piped input
- Add optional `pipedInput?: string[]` to `CommandContext` or handler signature
- Commands like `grep`, `cat`, `sort` (future) check `pipedInput` when no file arg is given

---

### 3. `src/lib/commands/types.ts` — Extend types

**Add to handler context**:
```ts
pipedInput?: string[]
```

**Modify `CommandResult`**:
```ts
type CommandResult = {
  success: boolean
  output?: string[]      // Machine-readable output for pipe capture
  error?: string
  data?: Record<string, unknown>
  pipedOutput?: string[] // Output to pass to next pipeline stage
}
```

---

### 4. `src/lib/commands/grep.ts` — Accept piped input

If `context.pipedInput` is set and no file argument is given, search the piped lines instead of a file.

### 5. `src/lib/commands/cat.ts` — Accept piped input

If `context.pipedInput` is set and `-` or no file arg, output piped lines.

---

## Testing Checklist

1. `ls | grep src` → filters directory listing
2. `echo hello > test.txt` → creates/overwrites file with "hello"
3. `echo hello >> test.txt` → appends to file
4. `ls -la | grep .ts` → pipe with flags
5. `cat nonexistent | head` → error handling in pipeline
6. `echo "hello world" > /tmp/out.txt` → redirect with path
7. `rm -rf / > out.txt` → redirect easter egg output
8. Existing single commands still work (no pipe, no redirect)

---

## Status

**Status:** 📝 Planned — not yet implemented.

---

## Related Documents

- [F001-environment-variables.md](F001-environment-variables.md) — Env vars would expand in piped arguments
