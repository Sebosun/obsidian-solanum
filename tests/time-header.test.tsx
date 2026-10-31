// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { TimeHeader } from "@/components/clock/TimeHeader";

afterEach(cleanup);

describe("the time at the top of the view", () => {
  it("shows the time as fixed-width digits, with the name of the phase above it", () => {
    const view = render(
      <TimeHeader remaining={4 * 60_000 + 56_000} reduced={false} caption="Break time" />,
    );
    const header = view.container.querySelector(".solanum-time-header")!;
    expect(header.querySelector(".solanum-time-caption")?.textContent).toBe("Break time");
    const readout = header.querySelector(".solanum-clock-readout")!;
    expect(readout.textContent).toBe("04:56");
    expect(readout.querySelectorAll(".solanum-clock-cell")).toHaveLength(5);
    const caption = header.querySelector(".solanum-time-caption")!;
    expect(
      caption.compareDocumentPosition(readout) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("is left out of what assistive technology reads, since the page has its own timer", () => {
    const view = render(<TimeHeader remaining={60_000} reduced={false} />);
    expect(view.container.firstElementChild?.getAttribute("aria-hidden")).toBe("true");
  });

  it("works without a caption", () => {
    const view = render(<TimeHeader remaining={60_000} reduced={false} />);
    expect(view.container.querySelector(".solanum-time-caption")).toBeNull();
    expect(view.container.querySelector(".solanum-clock-readout")?.textContent).toBe("01:00");
  });

  it("changes the digits as time passes", () => {
    const view = render(<TimeHeader remaining={60_000} reduced />);
    view.rerender(<TimeHeader remaining={59_000} reduced />);
    expect(view.container.querySelector(".solanum-clock-readout")?.textContent).toBe("00:59");
  });

  it("sizes itself from the view, not from fixed pixels", () => {
    const view = render(<TimeHeader remaining={60_000} reduced={false} caption="Break time" />);
    const header = view.container.querySelector<HTMLElement>(".solanum-time-header")!;
    expect(header.innerHTML).not.toMatch(/\bpx\b/);
  });
});
