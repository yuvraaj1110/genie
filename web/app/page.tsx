"use client";

import { useState } from "react";
import { IntroSequence } from "@/components/IntroSequence";
import { BuildScreen, type DeployConfig } from "@/components/BuildScreen";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

export default function Page() {
  const reduced = usePrefersReducedMotion();
  const [introDone, setIntroDone] = useState(false);

  // Mocked deploy until the backend plan lands.
  async function handleDeploy(cfg: DeployConfig) {
    await new Promise((r) => setTimeout(r, 1200));
    // eslint-disable-next-line no-console
    console.log("[mock deploy]", cfg);
    alert(`Mock deploy:\n\n${cfg.goal}\n\nData points: ${cfg.dataPoints.join(", ") || "—"}`);
  }

  return (
    <main className="min-h-screen grid place-items-center px-12 py-12 overflow-hidden">
      {!introDone ? (
        <IntroSequence enabled={!reduced} onDone={() => setIntroDone(true)} />
      ) : (
        <BuildScreen headlineEnabled={!reduced} onDeploy={handleDeploy} />
      )}
    </main>
  );
}
