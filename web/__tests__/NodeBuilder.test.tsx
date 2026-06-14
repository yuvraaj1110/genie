import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { NodeBuilder } from "@/components/NodeBuilder";

describe("NodeBuilder", () => {
  it("renders the default fintech nodes", () => {
    render(<NodeBuilder onDeploy={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Right Party Check/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Qualify · Employment/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Human Handoff/i })).toBeInTheDocument();
  });

  it("shows the selected node's editable config", () => {
    render(<NodeBuilder onDeploy={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Qualify · Loan amount/i }));
    // its question field is shown and editable
    expect(screen.getByLabelText(/Question \(Hindi\)/i)).toBeInTheDocument();
  });

  it("edits a text field", () => {
    render(<NodeBuilder onDeploy={vi.fn()} />);
    // RPC is selected by default; edit its opening line
    const field = screen.getByLabelText(/Opening line \(Hindi\)/i) as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: "बदला हुआ लाइन" } });
    expect(field.value).toBe("बदला हुआ लाइन");
  });

  it("adds a step", () => {
    render(<NodeBuilder onDeploy={vi.fn()} />);
    const before = screen.getAllByTestId("node-card").length;
    fireEvent.click(screen.getByRole("button", { name: /add step/i }));
    const after = screen.getAllByTestId("node-card").length;
    expect(after).toBe(before + 1);
  });

  it("deploys with a payload describing the nodes and shows a deploying state", async () => {
    const onDeploy = vi.fn().mockResolvedValue(undefined);
    render(<NodeBuilder onDeploy={onDeploy} />);
    fireEvent.click(screen.getByRole("button", { name: /see simulation/i }));
    await waitFor(() =>
      expect(onDeploy).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: expect.any(Array),
          dataPoints: 2,
          maxDurationSec: expect.any(Number),
        }),
      ),
    );
  });
});
