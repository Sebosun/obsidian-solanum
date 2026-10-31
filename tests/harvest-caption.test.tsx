// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HarvestCaption } from "@/components/harvest/HarvestCaption";

afterEach(cleanup);

describe("the caption under a harvest view", () => {
  it("is a line of text", () => {
    render(<HarvestCaption text="No harvests in 2027 yet." />);
    expect(screen.getByText("No harvests in 2027 yet.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("can offer one action beside the text, which does what it says", () => {
    const run = vi.fn();
    render(
      <HarvestCaption
        text="No matching harvests this month."
        action={{ label: "Clear filters", run }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(run).toHaveBeenCalledOnce();
  });
});
