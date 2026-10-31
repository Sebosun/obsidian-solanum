// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { HarvestLoading } from "@/components/harvest/HarvestLoading";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the harvest loading indicator", () => {
  it("is announced at once but only drawn if loading takes a noticeable while", () => {
    render(<HarvestLoading onRetry={() => {}} />);
    const status = screen.getByRole("status", { name: "Loading harvest" });
    expect(status.querySelector(".solanum-spinner")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(status.querySelector(".solanum-spinner")).toBeNull();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(status.querySelector(".solanum-spinner")).not.toBeNull();
  });

  it("still gives up with a way to retry after a bounded wait", () => {
    render(<HarvestLoading onRetry={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(8100);
    });
    expect(screen.getByRole("button", { name: /retry|try again/i })).toBeTruthy();
  });
});
