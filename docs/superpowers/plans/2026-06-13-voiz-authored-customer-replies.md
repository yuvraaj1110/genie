# Authored Customer Replies (Demo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user author each step's customer reply so the simulated (mock) Hindi call — and the captured data for custom steps — is fully their text, with zero API cost.

**Architecture:** Add a `reply` text field to the input-bearing nodes; `buildDemoScript` plays that reply (falling back to the canned line) and, for free-text/custom captures, stores it as the captured value. Enum captures (employment/amount) keep first-option so scoring is valid. The node editor renders the field automatically; the real `?real=1` compiler ignores it.

**Tech Stack:** Next.js 14, TypeScript, Vitest. Run all commands from `web/`.

---

### Task 1: Add `reply` field to the node model

**Files:**
- Modify: `web/lib/nodes.ts`
- Test: `web/__tests__/nodes.test.ts` (verify existing still pass; no new test required here)

- [ ] **Step 1: Edit `DEFAULT_NODES`** — append a `reply` text field to the rpc, interest, employment, and amount nodes (NOT offer, NOT handoff). The default value is the canned line currently used in `demoScript.ts`.

In `web/lib/nodes.ts`, update these four nodes' `fields` arrays by adding the `reply` entry as the last field:

- rpc node — after the `retries` field, add:
```ts
      { key: "reply", label: "Sample customer reply (demo)", kind: "text", value: "जी हाँ, मैं ही बोल रहा हूँ।" },
```
- interest node — after the `question` field, add:
```ts
      { key: "reply", label: "Sample customer reply (demo)", kind: "text", value: "हाँ, ज़रा बताइए।" },
```
- employment node — after the `options` field, add:
```ts
      { key: "reply", label: "Sample customer reply (demo)", kind: "text", value: "मैं नौकरी करता हूँ।" },
```
- amount node — after the `options` field, add:
```ts
      { key: "reply", label: "Sample customer reply (demo)", kind: "text", value: "एक से तीन लाख तक।" },
```

- [ ] **Step 2: Edit `makeCustomNode`** — add a blank `reply` field. The current `fields` array is:
```ts
    fields: [
      { key: "question", label: "Question (Hindi)", kind: "text", value: "" },
      { key: "field", label: "Capture as", kind: "text", value: "custom_field" },
    ],
```
Replace with:
```ts
    fields: [
      { key: "question", label: "Question (Hindi)", kind: "text", value: "" },
      { key: "field", label: "Capture as", kind: "text", value: "custom_field" },
      { key: "reply", label: "Sample customer reply (demo)", kind: "text", value: "" },
    ],
```

- [ ] **Step 3: Verify existing tests + typecheck**

Run: `npx vitest run __tests__/nodes.test.ts && npx tsc --noEmit`
Expected: nodes tests PASS (countDataPoints still 2, makeCustomNode fields ≥1), tsc clean.

- [ ] **Step 4: Commit**
```bash
git add web/lib/nodes.ts
git commit -m "feat(web): add editable 'reply' field to input-bearing nodes"
```

---

### Task 2: Play the authored reply in the simulation

**Files:**
- Modify: `web/lib/demoScript.ts`
- Test: `web/__tests__/demoScript.test.ts`

- [ ] **Step 1: Write the failing tests** — append these cases to the existing `describe("buildDemoScript", ...)` block in `web/__tests__/demoScript.test.ts`:

```ts
  it("plays an authored reply as the customer line", () => {
    const nodes = DEFAULT_NODES.map((n) =>
      n.type === "employment"
        ? { ...n, fields: n.fields.map((f) => (f.key === "reply" ? { ...f, value: "Ji main salaried hoon" } : f)) }
        : n,
    );
    const keys = compileAgent(nodes, GLOBALS).captureKeys;
    const s = buildDemoScript(nodes, keys);
    const userLines = s.filter(
      (x): x is Extract<ScriptStep, { kind: "transcript" }> => x.kind === "transcript" && x.role === "user",
    );
    expect(userLines.some((l) => l.text === "Ji main salaried hoon")).toBe(true);
  });

  it("captures the reply text verbatim for a custom (free-text) node", () => {
    const custom: AgentNode = {
      id: "n-custom-1", type: "custom", title: "State", desc: "", pill: "DATA",
      icon: "interest", accent: "violet", capturesData: true,
      fields: [
        { key: "question", label: "Q", kind: "text", value: "Aap kaunsi state se ho?" },
        { key: "field", label: "as", kind: "text", value: "state" },
        { key: "reply", label: "Sample customer reply (demo)", kind: "text", value: "Main Maharashtra se hoon" },
      ],
    };
    const nodes = [DEFAULT_NODES[0], custom, DEFAULT_NODES[5]];
    const keys = compileAgent(nodes, GLOBALS).captureKeys;
    const s = buildDemoScript(nodes, keys);
    let state = initialCallState(0);
    for (const step of s) for (const ev of eventsForStep(step, 1000)) state = reduceCall(state, ev);
    expect(state.submitArgs?.state).toBe("Main Maharashtra se hoon");
    expect(state.captured).toContain("state");
  });

  it("falls back to a non-empty canned line when reply is blank", () => {
    const custom: AgentNode = {
      id: "n-custom-1", type: "custom", title: "X", desc: "", pill: "DATA",
      icon: "interest", accent: "violet", capturesData: true,
      fields: [
        { key: "question", label: "Q", kind: "text", value: "Sawaal?" },
        { key: "field", label: "as", kind: "text", value: "x" },
        { key: "reply", label: "r", kind: "text", value: "" },
      ],
    };
    const nodes = [DEFAULT_NODES[0], custom, DEFAULT_NODES[5]];
    const keys = compileAgent(nodes, GLOBALS).captureKeys;
    const s = buildDemoScript(nodes, keys);
    const userLines = s.filter(
      (x): x is Extract<ScriptStep, { kind: "transcript" }> => x.kind === "transcript" && x.role === "user",
    );
    expect(userLines.every((l) => l.text.length > 0)).toBe(true);
  });
```

- [ ] **Step 2: Run the tests, verify they FAIL**

Run: `npx vitest run __tests__/demoScript.test.ts`
Expected: the two new behavior tests fail (reply not yet read; custom capture is `"PROVIDED"` not the reply). The blank-fallback test may already pass.

- [ ] **Step 3: Implement** — in `web/lib/demoScript.ts`:

Change `captureValue` to accept the resolved reply:
```ts
function captureValue(node: AgentNode, reply: string): string {
  const opts = node.fields.find((f) => f.key === "options")?.value;
  if (Array.isArray(opts) && opts.length > 0) return String(opts[0]);
  return reply.trim() || "PROVIDED";
}
```

In `buildDemoScript`, inside the `for (const node of nodes)` loop, replace the customer-line + capture section. The current code is:
```ts
    push({ kind: "transcript", role: "user", text: CANNED_USER[node.type] ?? CANNED_USER.custom });

    if (node.capturesData) {
      const key = keyFor(node.id);
      if (key) push({ kind: "capture", key, value: captureValue(node) });
    }
```
Replace with:
```ts
    const reply = field(node, "reply").trim() || CANNED_USER[node.type] || CANNED_USER.custom;
    push({ kind: "transcript", role: "user", text: reply });

    if (node.capturesData) {
      const key = keyFor(node.id);
      if (key) push({ kind: "capture", key, value: captureValue(node, reply) });
    }
```

- [ ] **Step 4: Run the tests, verify they PASS** (`npx vitest run __tests__/demoScript.test.ts`) — all cases pass, including the pre-existing `employment_type === "SALARIED"` / `loan_amount_range === "1-3L"` assertions (enum capture unchanged).

- [ ] **Step 5: Full typecheck + suite**

Run: `npx tsc --noEmit && npm test`
Expected: tsc clean; full suite green.

- [ ] **Step 6: Commit**
```bash
git add web/lib/demoScript.ts web/__tests__/demoScript.test.ts
git commit -m "feat(web): play authored customer reply in sim; custom capture = reply text"
```

---

### Task 3: Manual verification + docs note

**Files:**
- Modify: `web/README.md`

- [ ] **Step 1: Extend the "Demo modes" section** in `web/README.md` — add this sentence to the **Mock** bullet (or just after it):

```markdown
  Each step has an editable **Sample customer reply** field — type any text
  (Hinglish included) and the simulation plays it as the customer's line; for
  custom steps it also becomes the captured value in the result. Add a step,
  type its question + reply, and it appears as an extra exchange in the sim.
```

- [ ] **Step 2: Manual verification (human, browser)**

Run `npm run dev`, open `http://localhost:3000`:
- Add a custom step, set question `Aap kaunsi state se ho?`, capture-as `state`, reply `Main Maharashtra se hoon`.
- Build → **See Simulation** → **Talk**: confirm the extra Agent→Customer exchange plays with your text, and the **result JSON shows `state: "Main Maharashtra se hoon"`**.
- Edit a built-in node's reply (e.g. employment) and confirm the customer line changes in the next run.

- [ ] **Step 3: Commit**
```bash
git add web/README.md
git commit -m "docs(web): note editable per-step customer reply in demo modes"
```

---

## Self-Review

**Spec coverage:**
- `reply` on rpc/interest/employment/amount + custom, defaults = canned lines, none on offer/handoff → Task 1. ✓
- Sim plays reply with canned fallback → Task 2 Step 3. ✓
- Custom capture = reply text; enum keeps first option → Task 2 (`captureValue(node, reply)`). ✓
- UI auto-renders (no NodeBuilder change), compiler ignores `reply` → no task needed (verified during brainstorming: `NodeBuilder` maps `selected.fields`; `compileAgent` reads only specific keys). ✓
- Tests: reply-as-transcript, custom-capture-equals-reply, blank-fallback, enum-unchanged → Task 2 Step 1 + existing assertions. ✓
- Docs note → Task 3. ✓

**Placeholder scan:** none — all steps have concrete code/commands.

**Type consistency:** `captureValue(node, reply)` is the only signature change and is updated at its single call site. `field(node, "reply")` uses the existing `field` helper. `ScriptStep`, `eventsForStep`, `CANNED_USER`, `compileAgent`, `AgentNode` all match current definitions.
