export type Phrase = { lang: "en" | "hi"; html: string };

export const HEADLINE_PHRASES: Phrase[] = [
  { lang: "en", html: 'Deploy a <span class="accent">loan qualification</span> agent in 60 seconds.' },
  { lang: "hi", html: '<span class="font-deva">60 सेकंड में एक <span class="accent">loan qualification</span> एजेंट बनाइए।</span>' },
  { lang: "en", html: 'Spin up an <span class="accent">EMI collections</span> agent in Hindi.' },
  { lang: "hi", html: '<span class="font-deva">Hindi में <span class="accent">EMI collections</span> एजेंट तैनात करें।</span>' },
];

export const EYEBROW = "Hindi voice agents for lending & collections";

export type Preset = {
  id: string;
  label: string;
  caption: string;
  goal: string;
  dataPoints: string[];
};

export const PRESETS: Preset[] = [
  {
    id: "loan",
    label: "Loan lead qualification",
    caption: "RPC → interest → ticket size",
    goal: "RPC the borrower in Hindi, confirm interest in a personal loan, then capture employment type and ticket size. Hand off under 60 seconds.",
    dataPoints: ["employment", "ticket size"],
  },
  {
    id: "collections",
    label: "EMI / collections",
    caption: "DPD → Promise-to-Pay",
    goal: "Reach the right borrower in Hindi, confirm the overdue EMI, and capture a Promise-to-Pay date. Stay polite and under 60 seconds.",
    dataPoints: ["promise-to-pay date"],
  },
  {
    id: "kyc",
    label: "KYC follow-up",
    caption: "pending documents",
    goal: "Reach the applicant in Hindi and confirm which pending KYC documents they will re-submit. Under 60 seconds.",
    dataPoints: ["pending documents"],
  },
  {
    id: "insurance",
    label: "Insurance renewal",
    caption: "nudge & confirm",
    goal: "Reach the policyholder in Hindi, remind them of the upcoming renewal, and confirm intent to renew. Under 60 seconds.",
    dataPoints: ["renewal intent"],
  },
];

export type PipelineNode = {
  id: "customer" | "agent" | "json" | "rep";
  label: string;
  caption?: string;
};

export const PIPELINE: PipelineNode[] = [
  { id: "customer", label: "Customer", caption: "हाँ जी, बोल रहा हूँ" },
  { id: "agent", label: "VOIZ agent", caption: "DEPLOYED IN 60s" },
  { id: "json", label: "structured disposition" },
  { id: "rep", label: "Sales rep", caption: "picks up pre-qualified" },
];

export const TAGLINE_HTML =
  'From customer to qualified lead — <span class="accent">before a human says hello.</span>';

export const DISPOSITION_JSON = {
  interest: "YES",
  employment: "SALARIED",
  ticket: "5L+",
  score: 92,
};
