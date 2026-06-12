# VOIZ Public Demo Hardening — Design

**Date:** 2026-06-12
**Status:** Approved
**Context:** Portfolio goal. The live-call demo (build → deploy → Vapi voice → scored result) works end-to-end locally. Before exposing it on a public URL, it must be safe against runaway Vapi cost and abuse. This spec covers the cost/abuse cap layer plus the Vercel deploy steps. It does **not** change the builder, compiler, or voice logic.

## Goal

Expose the VOIZ demo publicly so recruiters / Predixion can click and try a real Hindi voice call, while guaranteeing the owner never pays out of pocket (stays within the Vapi $10 free signup credit).

## Constraints (owner decisions)

- **Lifetime cost cap**, not daily — the $10 credit is one-time and ~$1.87 is already spent.
- **2 calls per IP per day.**
- **Fail-closed:** if the limit store is unreachable, refuse real calls.
- **Never exceed free tier under any scenario** — see "Honest limitation" below; this is why a Vapi-dashboard hard limit is a required manual step, not optional.
- **Upstash Redis** as the store (owner is comfortable with Redis). No Vercel KV.

## Architecture

A single pure-ish module `web/lib/demo-limits.ts` encapsulates all cap logic over an injected store interface. Two existing API routes call it:

- `web/app/api/deploy/route.ts` — **before** creating a Vapi assistant, asks `checkAndReserve(ip)`. If denied, returns `429` with a reason; the assistant is never created.
- `web/app/api/vapi-events/route.ts` — on `end-of-call-report`, reads the call's real `cost` and calls `recordCost(cost)` to advance the lifetime accumulator.

The store is Upstash Redis via `@upstash/redis` (REST, works on Vercel Node runtime). Tests inject an in-memory fake implementing the same interface — no network in tests.

```
Browser ── Deploy ──▶ /api/deploy ──▶ demo-limits.checkAndReserve(ip)
                                          │ denied → 429 (UI shows limit card)
                                          │ allowed → INCR counters, clamp duration,
                                          ▼            create assistant
                                       Vapi assistant
Vapi ── end-of-call-report ──▶ /api/vapi-events ──▶ demo-limits.recordCost(realCost)
```

## Store interface & data model

```ts
// web/lib/demo-limits.ts
export interface LimitStore {
  incr(key: string): Promise<number>;              // returns new value
  incrByFloat(key: string, by: number): Promise<number>;
  get(key: string): Promise<string | null>;
  expire(key: string, seconds: number): Promise<void>;
}
```

Keys:

| Key | Type | TTL | Purpose |
|-----|------|-----|---------|
| `voiz:cost:total` | float | none | Lifetime demo $ spent. **Seeded once at ~1.87.** Guard for the free tier. |
| `voiz:calls:<YYYY-MM-DD>` | int | 48h | Global calls today (burst guard). |
| `voiz:ip:<ip>:<YYYY-MM-DD>` | int | 48h | Per-IP calls today. |

Dates are UTC `YYYY-MM-DD`. TTL set on first INCR of a dated key (INCR then EXPIRE if value === 1).

## Config (env vars, with defaults)

| Var | Default | Meaning |
|-----|---------|---------|
| `UPSTASH_REDIS_REST_URL` | — | Upstash endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | — | Upstash token |
| `DEMO_TOTAL_COST_CAP_USD` | `6` | Refuse deploy once lifetime cost ≥ this. $4 buffer under $10. |
| `DEMO_DAILY_CALL_CAP` | `30` | Global calls/day. |
| `DEMO_IP_DAILY_CAP` | `2` | Calls/day per IP. |
| `DEMO_MAX_CALL_SEC` | `45` | Hard clamp on per-call duration (overrides builder value if higher). |
| `DEMO_BYPASS_TOKEN` | — | If request presents this (query `?bypass=` or cookie), all checks skip. Owner's escape hatch for the live demo. |

`VAPI_PRIVATE_KEY` / `VAPI_PUBLIC_KEY` remain as today.

## Enforcement flow — `checkAndReserve(ip, opts)`

1. If `opts.bypass === DEMO_BYPASS_TOKEN` (and token is set) → return `{ ok: true }`, **no counters touched**.
2. Read `voiz:cost:total`. If `>= DEMO_TOTAL_COST_CAP_USD` → `{ ok: false, reason: "budget" }`.
3. Read `voiz:calls:<today>`. If `>= DEMO_DAILY_CALL_CAP` → `{ ok: false, reason: "daily" }`.
4. Read `voiz:ip:<ip>:<today>`. If `>= DEMO_IP_DAILY_CAP` → `{ ok: false, reason: "ip" }`.
5. All pass → INCR `voiz:calls:<today>` and `voiz:ip:<ip>:<today>` (set 48h TTL when they become 1) → `{ ok: true }`.

**Fail-closed:** any store error in steps 2–5 → `{ ok: false, reason: "store" }`. The bypass path (step 1) does not touch the store, so the owner's demo survives an Upstash outage.

`recordCost(realCost)` → `incrByFloat("voiz:cost:total", realCost)`. Store errors here are logged, not thrown (the call already happened; we don't want to 500 the webhook). A failed record means we under-count slightly — acceptable, and the daily/IP caps plus the Vapi dashboard limit still bound exposure.

## `/api/deploy` integration

- Resolve IP from `x-forwarded-for` (first hop) / `x-real-ip`; fallback `"unknown"`.
- Read bypass from `?bypass=` query or `demo_bypass` cookie.
- Call `checkAndReserve`. On `!ok`, return `429 { error, reason }`.
- On `ok`, clamp `maxDurationSec = Math.min(payload.maxDurationSec, DEMO_MAX_CALL_SEC)` before compiling, then proceed exactly as today.

## `/api/vapi-events` integration

- On `end-of-call-report`, extract cost: prefer `message.cost`, fall back to `message.artifact?.cost` / summing `message.costs[]`. Coerce to number; if `> 0`, call `recordCost(cost)`.
- Existing tool-call ack behavior unchanged.

## UI — limit reached

`web/app/page.tsx` `handleDeploy`: on `429`, instead of `alert()`, set a `limitReason` state and render a calm card in the build stage:

> **Live demo paused.** This demo runs real voice calls, so it's capped to protect costs. (reason-specific line: budget → "today's demo budget is used up"; ip → "you've used your 2 calls for today"; daily → "the demo's busy today — try again tomorrow"; store → "the demo is temporarily unavailable".)

Includes a placeholder link slot for a recorded demo (URL filled later — out of scope here). No `alert()`.

## Honest limitation (why the Vapi dashboard limit is required)

Vapi reports a call's cost only **after** it ends. Between `checkAndReserve` allowing a call and the webhook recording its cost, concurrent calls can start. So the code caps are **best-effort**: a pathological burst could overshoot the $6 software cap slightly. The chosen parameters bound this (45s ⇒ ≤ ~$0.06/call, 2/IP/day, 30/day global, $4 buffer), but the only mechanism that *guarantees* "never exceed, under any scenario" is Vapi's platform-level hard spend limit.

**Required manual step (not code):** in the Vapi dashboard, set a hard spending limit of **$8**. This is the true ceiling. Upstash provides graceful UX + per-IP throttle on top.

## Testing

`web/__tests__/demo-limits.test.ts` against an in-memory fake `LimitStore`:

- under all caps → `ok`, counters incremented, TTL set on first hit.
- lifetime cost ≥ cap → `reason: "budget"`, no increment.
- global daily ≥ cap → `reason: "daily"`.
- per-IP ≥ cap → `reason: "ip"` (and a second IP still allowed).
- store throws → `reason: "store"` (fail-closed).
- bypass token matches → `ok`, **no counters touched**, even when caps would otherwise deny.
- `recordCost` advances `voiz:cost:total`; store error is swallowed (no throw).

No network/integration test for Upstash itself (manual verify on deploy).

## Deploy (documented manual steps)

1. Vercel project, **root directory = `web/`**, framework Next.js.
2. Create an Upstash Redis DB (free tier); copy REST URL + token.
3. Set Vercel env vars: `VAPI_PRIVATE_KEY`, `VAPI_PUBLIC_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `DEMO_BYPASS_TOKEN`, and any cap overrides.
4. Seed the accumulator once: `SET voiz:cost:total 1.87` (via Upstash console) so the lifetime cap accounts for prior spend.
5. **Set a hard $8 spend limit in the Vapi dashboard** (the guarantee).
6. Deploy. `/api/vapi-events` is publicly reachable on the Vercel URL (no ngrok). Verify: open the URL, build → Deploy → Talk a ≤45s call, confirm result card; then confirm a 3rd call from the same IP is refused.

## Out of scope

- Recorded demo video / link (placeholder slot only).
- Auth / multi-tenant.
- Builder/compiler/voice changes.
- Analytics dashboard.
