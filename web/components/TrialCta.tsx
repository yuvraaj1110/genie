const MAIL = "yuvraajsuri1110@gmail.com";
const SUBJECT = "VOIZ — trial request";
const BODY = "Hi Yuvraaj, I tried the VOIZ demo and would like to start a trial.";

const HREF = `mailto:${MAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;

const BASE = "bg-amber-300 text-ink font-semibold hover:bg-amber-200 transition-all";

export function TrialCta({
  variant = "inline",
  label = "Get real trial",
}: {
  variant?: "floating" | "inline";
  label?: string;
}) {
  const cls =
    variant === "floating"
      ? `fixed top-5 right-6 z-50 text-sm px-4 py-2 rounded-lg ${BASE}`
      : `inline-block text-base px-7 py-3.5 rounded-xl ${BASE}`;
  return (
    <a href={HREF} className={cls}>
      {label}
    </a>
  );
}
