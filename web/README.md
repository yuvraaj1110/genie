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
- `components/` — `IntroSequence` (State 0), `BuildScreen` (State 1), `icons`
- `lib/` — `content` (copy/presets), `useHeadlineCycle`, `useIntroTimeline`,
  `usePrefersReducedMotion`

## Deploy (later)

Vercel project root = `web/`. Backend env vars (`ANTHROPIC_API_KEY`,
`VAPI_*`) are added when the backend plan lands.
