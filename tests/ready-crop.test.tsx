// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useReadyCrop } from "@/hooks/useReadyCrop";
import type { CropId } from "@/lib/crops/catalog";

const gates = vi.hoisted(() => ({
  ready: new Map<string, { resolve(): void; reject(e: Error): void }>(),
}));
vi.mock("@/state/cropAssets", () => ({
  getCropAssets: () => ({
    ready: (crop: string) =>
      new Promise<void>((resolve, reject) => {
        gates.ready.set(crop, { resolve, reject });
      }),
  }),
}));
vi.mock("@/state/hooks", () => ({ useServices: () => ({}) }));

const settle = () => act(async () => {});

describe("waiting for a crop's models before showing it", () => {
  it("shows the first crop straight away, without waiting", () => {
    const { result } = renderHook(() => useReadyCrop("tomato"));
    expect(result.current).toBe("tomato");
  });

  it("keeps the old crop until the new one's models have loaded, then switches", async () => {
    gates.ready.clear();
    const { result, rerender } = renderHook(({ crop }: { crop: CropId }) => useReadyCrop(crop), {
      initialProps: { crop: "tomato" as CropId },
    });
    rerender({ crop: "coconut" });
    await settle();
    expect(result.current).toBe("tomato");
    await act(async () => gates.ready.get("coconut")!.resolve());
    expect(result.current).toBe("coconut");
  });

  it("switches anyway when loading fails, so the scene can show the error", async () => {
    gates.ready.clear();
    const { result, rerender } = renderHook(({ crop }: { crop: CropId }) => useReadyCrop(crop), {
      initialProps: { crop: "tomato" as CropId },
    });
    rerender({ crop: "corn" });
    await act(async () => gates.ready.get("corn")!.reject(new Error("Vault unavailable")));
    expect(result.current).toBe("corn");
  });

  it("ignores a crop that was replaced while it was loading", async () => {
    gates.ready.clear();
    const { result, rerender } = renderHook(({ crop }: { crop: CropId }) => useReadyCrop(crop), {
      initialProps: { crop: "tomato" as CropId },
    });
    rerender({ crop: "corn" });
    rerender({ crop: "pumpkin" });
    await act(async () => gates.ready.get("pumpkin")!.resolve());
    expect(result.current).toBe("pumpkin");
    await act(async () => gates.ready.get("corn")!.resolve());
    expect(result.current).toBe("pumpkin");
  });

  it("goes back at once to a crop that was only being switched away from", async () => {
    gates.ready.clear();
    const { result, rerender } = renderHook(({ crop }: { crop: CropId }) => useReadyCrop(crop), {
      initialProps: { crop: "tomato" as CropId },
    });
    rerender({ crop: "corn" });
    rerender({ crop: "tomato" });
    await settle();
    expect(result.current).toBe("tomato");
  });
});
