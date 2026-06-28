# Implementation Plan: Security Review — Client/Server Boundary & Server Functions

Full security audit of the TanStack Start client/server boundary, server function data flow, and cross-boundary sensitive information exposure.

**Status:** PLANNED
**Dependencies:** P006 TanStack Start Migration, P007 Clerk Authentication, P012 Server Storage Sync

---

## Executive Summary

The codebase is **generally secure** — no `eval`, `innerHTML`, or `dangerouslySetInnerHTML`; all `process.env` secrets are confined to server-only code; the markdown renderer emits React elements directly. Three issues warrant fixes, one of which is critical and two that are medium-severity hardening items.

---

## Findings & Fixes

### FINDING 1 (HIGH): SSRF in `curl` command

**Location:** `src/lib/commands/curl.ts:58-72`

**Issue:** `runCurlRequest` is a server-side proxy that makes HTTP requests to arbitrary user-supplied URLs. There is **no blocklist** for private/internal IP ranges. An authenticated (or even anonymous, since `__session` is optional) user can probe:
- `localhost` services (`http://localhost:5432` — Postgres, `http://localhost:3000` — app itself)
- Cloud metadata endpoints (`http://169.254.169.254/latest/meta-data/`)
- Internal Docker hosts, Kubernetes services, Vercel internal endpoints

The URL is Zod-validated as a valid URL (`z.string().url()`), but this only checks format, not destination safety.

**Fix:** Add IP resolution validation in `executeHttpRequest` that rejects requests to:
- Loopback: `127.0.0.0/8`, `::1`
- Private: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
- Link-local: `169.254.0.0/16`
- Cloud metadata: `169.254.169.254`
- Internal: `0.0.0.0/8`, `100.64.0.0/10` (CGNAT), `198.18.0.0/15` (benchmarking)
- IPv4-mapped IPv6 equivalents

Use Node's `dns.promises.lookup()` to resolve the hostname to an IP before connecting.

Additionally, strip `set-cookie` from returned headers to avoid leaking server-side cookies to the terminal output.

---

### FINDING 2 (MEDIUM): Bare type cast in `saveServerStateFn` validator

**Location:** `src/lib/serverStorage.ts:42-44`

```typescript
.validator((data: unknown): ServerStatePayload => {
  return data as ServerStatePayload
})
```

**Issue:** The validator is a bare `as` type assertion. The function `isValidPayload()` exists at line 130-141 with proper runtime shape validation (`v === 1`, `Array.isArray(fileSystem)`, `typeof currentPath === 'string'`, etc.), but it is only used client-side in `loadStateFromServer()`.

A malformed or malicious client request could write arbitrary JSON to the database. Impact is limited (per-user row only), but unnecessary risk.

**Fix:** Import and use `isValidPayload` in the validator:

```typescript
.validator((data: unknown): ServerStatePayload => {
  if (!isValidPayload(data)) throw new Error('Invalid payload shape')
  return data
})
```

This also requires moving `isValidPayload` above the validator call, or extracting it to a shared location.

---

### FINDING 3 (LOW): Return all response headers from curl proxy

**Location:** `src/lib/commands/curl.ts:62-67`

```typescript
return {
  status: result.status,
  statusText: result.statusText,
  headers: result.headers,   // all headers returned to client
  body: result.body,
}
```

**Issue:** All response headers from the proxied request are returned to the client, including potentially sensitive `set-cookie`, `authorization` (if the target server echoes it), or internal server header values. The user controls the URL, so they could target a server they control to observe how the proxy behaves, but more importantly, `set-cookie` headers from internal services could leak session patterns.

**Fix:** Strip `set-cookie` from headers before returning. Consider also filtering `set-cookie`, `cookie`, `authorization`, `www-authenticate` headers.

---

### FINDING 4 (INFO): Live secrets in `.env` file

**Location:** `.env` (gitignored, on disk)

**Issue:** Live `CLERK_SECRET_KEY` and `DATABASE_URL` with password exist on disk. While `.gitignore` prevents git tracking, these can leak via:
- Backup software that doesn't respect `.gitignore`
- IDE workspace files that sync to cloud
- Screenshare or pair-programming sessions
- `cat`/`print` during debugging

**Fix:** Create `.env.example` with placeholder values matching the same variable names. Rotate the current credentials since they have been exposed.

---

### FINDING 5 (INFO): Unused network-reachable Postgres

**Location:** `docker-compose.yml` + `drizzle.config.ts`

**Issue:** The Postgres URL in `.env` points to a **Neon serverless Postgres** with `sslmode=require`. This is a cloud-hosted DB accessible from anywhere with the connection string (which is in `.env` on disk). If the same DB is used in production deployments, the credentials should be scoped.

**Low risk** — the Neon connection string already includes `channel_binding=require`, and Neon uses IAM-like auth with IP restrictions available. But recommended to rotate if `.env` was shared.

---

## Changes to perform

### File: `src/lib/commands/curl.ts`

1. Add `dns` import from `node:dns/promises`
2. Add `net` import from `node:net`
3. Add `BLOCKED_IP_RANGES` constant with CIDR blocks
4. Add `isPrivateIP(ip: string): boolean` helper that checks against all blocked ranges using a simple prefix-match or `ip-cidr` package (avoid dependency — use manual prefix check for loops/private)
5. Add `resolveAndValidateUrl(url: string): Promise<string>` that:
   - Parses the URL hostname
   - Resolves it to IP(s) via `dns.lookup()`
   - Rejects if any resolved IP is private
6. Add `sanitizeHeaders(headers: object): object` that strips `set-cookie`, `set-cookie2`
7. Inject `resolveAndValidateUrl` and `sanitizeHeaders` into `executeHttpRequest` flow

Implementation approach for IP checking — simple numeric conversion for IPv4:

```typescript
function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return null
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

const BLOCKED_RANGES: [number, number][] = [
  [0x00000000, 0x00FFFFFF],   // 0.0.0.0/8
  [0x0A000000, 0x0AFFFFFF],   // 10.0.0.0/8
  [0x7F000000, 0x7FFFFFFF],   // 127.0.0.0/8
  [0xA9FE0000, 0xA9FEFFFF],   // 169.254.0.0/16
  [0xAC100000, 0xAC1FFFFF],   // 172.16.0.0/12
  [0xC0A80000, 0xC0A8FFFF],   // 192.168.0.0/16
  [0xC6120000, 0xC613FFFF],   // 198.18.0.0/15
  [0x64400000, 0x647FFFFF],   // 100.64.0.0/10
]
```

### File: `src/lib/serverStorage.ts`

1. Move `isValidPayload` (lines 130-141) **above** the `saveServerStateFn` definition
2. In `saveServerStateFn.validator()`, replace the bare cast with:
```typescript
.validator((data: unknown): ServerStatePayload => {
  if (!isValidPayload(data)) throw new Error('Invalid server state payload')
  return data
})
```

### File: `.env.example` (create)

```bash
# Clerk — https://clerk.com
VITE_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE

# PostgreSQL — must match docker-compose.yml or external provider
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### File: `.gitignore` (verify)

Ensure `.env.example` is NOT in `.gitignore` (it should be tracked), while `.env`, `.env.local`, `.env.*.local` remain excluded.

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| curl to `localhost` | Rejected with error message "curl: connection to internal/private IP not allowed" |
| curl to `127.0.0.1` | Same rejection |
| curl to `169.254.169.254` | Same rejection |
| curl to public IP that resolves fine | Allowed as before |
| curl to hostname that resolves to private IP | Rejected after DNS resolution |
| curl to hostname with multiple A records (some public, some private) | Rejected if ANY resolved IP is private |
| IPv6 link-local (`fe80::`) | Also blocked |
| `saveServerState` with malformed payload | Returns validation error, not written to DB |
| `saveServerState` with valid payload | Works as before |
| curl response has `set-cookie` | Header stripped from terminal output |

---

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/commands/curl.ts` | Modify | Add IP validation, header sanitization |
| `src/lib/serverStorage.ts` | Modify | Use `isValidPayload` in validator |
| `.env.example` | **Create** | Document required env vars without real secrets |

---

## Build Checklist

- [ ] Finding 1: Add IP resolution + private range check to `executeHttpRequest`
- [ ] Finding 1: Strip `set-cookie` from curl response headers
- [ ] Finding 2: Move `isValidPayload` above `saveServerStateFn` and use it in validator
- [ ] Finding 4: Create `.env.example` with placeholder values
- [ ] Verify app still builds: `npm run build`
- [ ] Verify curl rejects private IPs with clear error message
- [ ] Verify save/load state still works end-to-end
- [ ] Rotate live credentials (out of scope of code changes)
