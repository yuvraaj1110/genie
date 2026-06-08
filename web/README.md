# VOIZ Agent Builder — Web (frontend)

Next.js frontend for the plug-and-play Hindi voice-agent builder. This is the
**frontend-only** slice: animated intro → fintech Build screen with a mocked
deploy. Live generation/voice arrive in a later plan.

## Run

```bash
cd web
npm install
npm run dev        # http://localhost:3000
```

## Test

```bash
npm test           # Vitest + React Testing Library
```

## Build

```bash
npm run build
```

## Structure

- `app/` — App Router pages (`page.tsx` orchestrates State 0 → State 1)
- `components/` — `IntroSequence` (State 0), `NodeBuilder` (State 1),
  `LiveCall` (State 2), `ResultCard` (State 3), `icons`
- `lib/` — `nodes` (node model), `compiler` (node graph → Vapi config),
  `vapi` (assistant body + create), `payload-builder`, `latency-tracker`,
  `callReducer` + `useVapiCall`, `useIntroTimeline`, `usePrefersReducedMotion`

## Backend / live call

Deploy compiles your node graph into a Vapi assistant and runs a real
in-browser voice call.

### Env

Copy `.env.example` to `.env.local` and fill in:
- `VAPI_PRIVATE_KEY` — server-side, used by `/api/deploy` to create the assistant.
- `VAPI_PUBLIC_KEY` — sent to the browser for the Web SDK call.

### Flow
1. Build your agent (nodes) → **Deploy** → `POST /api/deploy` compiles the
   Hindi FSM prompt + tool schema and creates a Vapi assistant.
2. **Talk** starts a Web SDK call; the transcript streams and data fields
   light up as they're captured.
3. On end, the result card shows the scored CRM payload + latency, reusing
   the ported `payload-builder` + `latency-tracker`.

### Manual verification (needs real Vapi credentials)
- `npm run dev`, open the app, build → Deploy → Talk, speak Hindi, confirm
  the result card renders a payload with a `rep_priority_score`.
- On Vercel, set the two env vars in project settings; `/api/vapi-events`
  is publicly reachable (no ngrok needed).
