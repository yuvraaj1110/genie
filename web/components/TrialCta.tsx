const MAIL = "yuvraajsuri1110@gmail.com";
const SUBJECT = "VOIZ — free trial request";
const BODY = "Hi Yuvraaj, I tried the VOIZ demo and would like a free trial.";

const HREF = `mailto:${MAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;

const BASE =
  "bg-gradient-to-r from-amber-300 to-fuchsia-400 text-ink font-semibold hover:brightness-110 transition-all";

export function TrialCta({
  variant = "inline",
  label = "Start free trial →",
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
