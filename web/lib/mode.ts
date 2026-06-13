export type DemoMode = "mock" | "real";

/** Public demo is mocked (zero cost). Real Vapi only when ?real=1. */
export function resolveMode(search: string): DemoMode {
  return new URLSearchParams(search).get("real") === "1" ? "real" : "mock";
}
