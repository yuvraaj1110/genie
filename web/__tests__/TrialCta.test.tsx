import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrialCta } from "@/components/TrialCta";

describe("TrialCta", () => {
  it("links to the owner email via mailto with a prefilled subject", () => {
    render(<TrialCta />);
    const href = screen.getByRole("link").getAttribute("href") ?? "";
    expect(href).toContain("mailto:yuvraajsuri1110@gmail.com");
    expect(href).toContain("subject=");
  });

  it("renders a custom label", () => {
    render(<TrialCta label="Like it? Start free trial →" />);
    expect(screen.getByRole("link").textContent).toBe("Like it? Start free trial →");
  });
});
