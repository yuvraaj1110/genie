"use client";

import { useState } from "react";
import {
  DEFAULT_NODES,
  countDataPoints,
  estimateSeconds,
  makeCustomNode,
  updateFieldValue,
  type AgentNode,
  type Field,
  type IconKey,
  type AccentKey,
} from "@/lib/nodes";
import { EYEBROW } from "@/lib/content";
import {
  CustomerIcon,
  OfferIcon,
  InterestIcon,
  BriefcaseIcon,
  AmountIcon,
  RepIcon,
  ArrowIcon,
  PlusIcon,
  LockIcon,
  TrashIcon,
} from "./icons";

export type BuildPayload = {
  nodes: AgentNode[];
  dataPoints: number;
  estSeconds: number;
  voice: string;
  register: string;
  maxDurationSec: number;
};

const ICONS: Record<IconKey, (p: { className?: string }) => JSX.Element> = {
  customer: CustomerIcon,
  offer: OfferIcon,
  interest: InterestIcon,
  briefcase: BriefcaseIcon,
  amount: AmountIcon,
  rep: RepIcon,
};

// Per-node-type accent classes (static strings so Tailwind keeps them).
const ACCENT: Record<AccentKey, { chip: string; icon: string; ring: string; glow: string }> = {
  sky: { chip: "bg-sky-500/10", icon: "text-sky-300", ring: "border-sky-400/70", glow: "shadow-[0_0_28px_-6px_rgba(56,189,248,0.55)]" },
  emerald: { chip: "bg-emerald-500/10", icon: "text-emerald-300", ring: "border-emerald-400/70", glow: "shadow-[0_0_28px_-6px_rgba(16,185,129,0.55)]" },
  violet: { chip: "bg-violet-500/10", icon: "text-violet-300", ring: "border-violet-400/70", glow: "shadow-[0_0_28px_-6px_rgba(139,92,246,0.55)]" },
  amber: { chip: "bg-amber-500/10", icon: "text-amber-300", ring: "border-amber-400/70", glow: "shadow-[0_0_28px_-6px_rgba(245,158,11,0.55)]" },
  teal: { chip: "bg-teal-500/10", icon: "text-teal-300", ring: "border-teal-400/70", glow: "shadow-[0_0_28px_-6px_rgba(20,184,166,0.55)]" },
  rose: { chip: "bg-rose-500/10", icon: "text-rose-300", ring: "border-rose-400/70", glow: "shadow-[0_0_28px_-6px_rgba(244,63,94,0.55)]" },
};

export function NodeBuilder({ onDeploy }: { onDeploy: (p: BuildPayload) => Promise<void> }) {
  const [nodes, setNodes] = useState<AgentNode[]>(DEFAULT_NODES);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_NODES[0].id);
  const [voice] = useState("Aanya (Hindi)");
  const [register] = useState("Tier 2/3");
  const [maxDurationSec, setMaxDurationSec] = useState(60);
  const [deploying, setDeploying] = useState(false);

  const selected = nodes.find((n) => n.id === selectedId) ?? nodes[0];
  const dataPoints = countDataPoints(nodes);
  const estSeconds = estimateSeconds(nodes);

  function setField(fieldKey: string, value: Field["value"]) {
    setNodes((cur) => updateFieldValue(cur, selected.id, fieldKey, value));
  }

  function addStep() {
    setNodes((cur) => {
      const node = makeCustomNode(cur);
      // insert before the handoff (keep handoff last if present)
      const handoffIdx = cur.findIndex((n) => n.type === "handoff");
      const next = [...cur];
      if (handoffIdx === -1) next.push(node);
      else next.splice(handoffIdx, 0, node);
      setSelectedId(node.id);
      return next;
    });
  }

  function removeNode(id: string) {
    setNodes((cur) => {
      if (cur.length <= 1) return cur;
      const next = cur.filter((n) => n.id !== id);
      if (id === selectedId) setSelectedId(next[0].id);
      return next;
    });
  }

  async function handleDeploy() {
    if (deploying) return;
    setDeploying(true);
    try {
      await onDeploy({ nodes, dataPoints, estSeconds, voice, register, maxDurationSec });
    } finally {
      setDeploying(false);
    }
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-8 md:px-14 py-12">
      <div className="flex items-center gap-2.5">
        <span className="text-xs tracking-[1.5px] uppercase text-gold">{EYEBROW}</span>
      </div>
      <h1 className="font-extralight text-[44px] -tracking-[0.5px] mt-4">Build your agent</h1>
      <p className="text-muted font-light text-base mt-1.5 mb-8">
        Each step is a node. Configure it, add your own, then deploy.
      </p>

      {/* Global settings */}
      <div className="flex flex-wrap gap-2 mb-7">
        <span className="text-xs font-light text-muted border border-line2 px-[11px] py-1.5 rounded-full">
          🎙 Voice: {voice}
        </span>
        <span className="text-xs font-light text-muted border border-line2 px-[11px] py-1.5 rounded-full">
          Register: {register}
        </span>
        <label className="text-xs font-light text-muted border border-line2 px-[11px] py-1.5 rounded-full">
          Max call ≤{" "}
          <select
            aria-label="Max duration"
            value={maxDurationSec}
            onChange={(e) => setMaxDurationSec(Number(e.target.value))}
            className="bg-transparent outline-none text-muted"
          >
            <option className="bg-panel" value={30}>30s</option>
            <option className="bg-panel" value={45}>45s</option>
            <option className="bg-panel" value={60}>60s</option>
          </select>
        </label>
        <span className="text-[11px] text-gold border border-goldline px-[11px] py-1.5 rounded-full inline-flex items-center gap-1.5">
          <LockIcon className="w-3 h-3 text-gold" /> no Aadhaar / PAN / CVV
        </span>
      </div>

      {/* Horizontal node flow */}
      <div className="flex items-stretch gap-1 overflow-x-auto pb-3">
        {nodes.map((n, i) => {
          const Icon = ICONS[n.icon] ?? InterestIcon;
          const active = n.id === selected.id;
          const a = ACCENT[n.accent];
          return (
            <div key={n.id} className="flex items-center">
              <button
                data-testid="node-card"
                onClick={() => setSelectedId(n.id)}
                className={`text-left w-[250px] shrink-0 bg-panel border rounded-2xl px-5 py-5 transition-all ${
                  active ? `${a.ring} ${a.glow}` : "border-line hover:border-line2"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-12 h-12 rounded-xl grid place-items-center shrink-0 ${a.chip}`}>
                    <Icon className={`w-6 h-6 ${a.icon}`} />
                  </span>
                  {n.capturesData && (
                    <span className="ml-auto text-[10px] tracking-wide text-gold border border-goldline rounded-full px-2.5 py-1">
                      DATA
                    </span>
                  )}
                </div>
                <div className="text-[18px] font-medium mt-4">{n.title}</div>
                <div className="text-[13px] font-light text-faint mt-1.5 leading-snug">{n.desc}</div>
              </button>
              {i < nodes.length - 1 && <ArrowIcon className="w-7 h-7 text-muted mx-1.5 shrink-0" />}
            </div>
          );
        })}

        <div className="flex items-center">
          <ArrowIcon className="w-7 h-7 text-muted mx-1.5 shrink-0" />
          <button
            onClick={addStep}
            className="w-[176px] h-full min-h-[140px] shrink-0 border border-dashed border-line2 rounded-2xl grid place-items-center text-faint hover:text-fg hover:border-fg/40 transition-colors"
          >
            <span className="flex flex-col items-center gap-2 text-sm font-light">
              <PlusIcon className="w-5 h-5" /> Add step
            </span>
          </button>
        </div>
      </div>

      {/* Config panel for the selected node */}
      <div className="mt-5 bg-panel border border-line rounded-2xl p-7">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="text-lg font-medium">{selected.title}</div>
          <span className="text-xs text-faint">{selected.pill}</span>
          {nodes.length > 1 && (
            <button
              onClick={() => removeNode(selected.id)}
              aria-label="Remove step"
              className="ml-auto text-faint hover:text-fg transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid gap-4">
          {selected.fields.map((f) => (
            <FieldEditor key={f.key} field={f} onChange={(v) => setField(f.key, v)} />
          ))}
        </div>
      </div>

      {/* Deploy bar */}
      <div className="flex items-center gap-3 mt-8 pt-6 border-t border-line">
        <span className="text-sm font-light text-faint">
          {nodes.length} steps · est. {estSeconds}s · {dataPoints} data point{dataPoints === 1 ? "" : "s"}
        </span>
        <button
          onClick={handleDeploy}
          disabled={deploying}
          className="ml-auto font-semibold text-base text-ink px-7 py-3.5 rounded-xl bg-amber-300 shadow-[0_8px_30px_-8px_rgba(245,158,11,0.5)] hover:bg-amber-200 disabled:opacity-40 transition-all"
        >
          {deploying ? "Starting…" : "See Simulation"}
        </button>
      </div>
    </div>
  );
}

function FieldEditor({ field, onChange }: { field: Field; onChange: (v: Field["value"]) => void }) {
  const label = (
    <label className="block text-xs tracking-wide uppercase text-faint mb-2">{field.label}</label>
  );

  if (field.kind === "number") {
    return (
      <div>
        {label}
        <input
          type="number"
          aria-label={field.label}
          value={Number(field.value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-32 bg-ink border border-line2 rounded-lg px-3 py-2.5 text-base font-light text-fg outline-none focus:border-fg/40"
        />
      </div>
    );
  }

  if (field.kind === "options") {
    const opts = field.value as string[];
    return (
      <div>
        {label}
        <div className="flex flex-wrap gap-2">
          {opts.map((opt, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 bg-ink border border-line2 rounded-lg pl-2.5 pr-1.5 py-1">
              <input
                aria-label={`${field.label} option ${i + 1}`}
                value={opt}
                onChange={(e) => {
                  const next = [...opts];
                  next[i] = e.target.value;
                  onChange(next);
                }}
                className="bg-transparent text-base font-light text-fg outline-none w-[120px]"
              />
              <button
                aria-label={`Remove option ${i + 1}`}
                onClick={() => onChange(opts.filter((_, j) => j !== i))}
                className="text-faint hover:text-fg text-xs px-1"
              >
                ×
              </button>
            </span>
          ))}
          <button
            onClick={() => onChange([...opts, "NEW"])}
            className="text-xs font-light text-faint border border-dashed border-line2 rounded-lg px-3 py-1.5 hover:text-fg hover:border-fg/40 transition-colors"
          >
            + add option
          </button>
        </div>
      </div>
    );
  }

  // text
  return (
    <div>
      {label}
      <textarea
        aria-label={field.label}
        rows={2}
        value={String(field.value)}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-ink border border-line2 rounded-lg px-3.5 py-3 text-base font-light text-fg outline-none focus:border-fg/40 resize-none font-deva"
      />
    </div>
  );
}
