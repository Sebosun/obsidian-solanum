// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { pickTextFile } from "@/plugin/pickTextFile";

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

/** Stands in for the system dialog: runs when the page asks for one. */
function onDialog(handler: (input: HTMLInputElement) => void) {
  vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (
    this: HTMLInputElement,
  ) {
    handler(this);
  });
}

describe("pickTextFile", () => {
  it("puts the file input in the page, so the browser really opens its dialog", async () => {
    let attached = false;
    onDialog((input) => {
      attached = document.body.contains(input);
      input.dispatchEvent(new Event("cancel"));
    });
    expect(await pickTextFile()).toBeNull();
    expect(attached).toBe(true);
    expect(document.querySelector("input[type=file]")).toBeNull(); // cleaned up
  });

  it("resolves with the text of the chosen file", async () => {
    onDialog((input) => {
      const file = new File(["a,b"], "x.csv");
      Object.defineProperty(input, "files", { value: [file] });
      input.dispatchEvent(new Event("change"));
    });
    expect(await pickTextFile({ accept: ".csv" })).toBe("a,b");
    expect(document.querySelector("input[type=file]")).toBeNull();
  });

  it("suggests the alternative when no dialog takes focus", async () => {
    vi.useFakeTimers();
    onDialog(() => {});
    const hint = vi.fn();
    void pickTextFile({ onNoDialog: hint });
    await vi.advanceTimersByTimeAsync(1000);
    expect(hint).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(hint).toHaveBeenCalledTimes(1);
  });

  it("stays quiet when the window loses focus to a dialog", async () => {
    vi.useFakeTimers();
    onDialog(() => window.dispatchEvent(new Event("blur")));
    const hint = vi.fn();
    void pickTextFile({ onNoDialog: hint });
    await vi.advanceTimersByTimeAsync(5000);
    expect(hint).not.toHaveBeenCalled();
  });
});
