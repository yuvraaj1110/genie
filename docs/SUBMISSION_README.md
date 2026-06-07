## What I built

A working outbound voice prototype of the qualification layer. It calls a loan prospect in Hindi, confirms the right party, states the offer, checks interest, then asks two qualifying questions — employment type, then loan-amount bucket — and hands off to a human rep with a structured JSON payload, inside 55 seconds. The conversation is a finite state machine in the LLM prompt (Vapi + Deepgram Nova-3 + Claude Haiku); a Node/Express webhook builds the CRM payload and scores each lead 0–100 for rep triage. Setup: `npm install`, then `npm run demo:edge-cases` replays all nine exit/failure paths through the real payload-builder. Full detail in `docs/SETUP.md`.

## What I'd do differently with more time

The decision I'm least confident in is asking employment type before loan amount. I ordered it as an eligibility filter — disqualify early, save seconds — but for a distrustful Tier 2/3 customer, a personal "salaried or business?" question before any value is established may raise their guard and increase early hangups. I'd A/B test both orderings against qualification-completion and drop-off rate before committing.

## One assumption I wish I could validate

That Tier 2/3 prospects will tolerate two extra qualifying questions (~25 added seconds) without hang-up rates rising enough to erase the rep-time savings the layer is meant to deliver.
