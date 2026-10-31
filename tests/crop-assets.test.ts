import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { CropAssets } from "@/lib/crops/CropAssets";

describe("vault binary crop loading", () => {
  it("shares one parse per model and retries failed vault reads", async () => {
    const read = vi.fn(async (filename: string) => {
      const bytes = readFileSync(`assets/crops/${filename}`);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    });
    const repository = new CropAssets(read);
    const first = repository.load("corn", 4);
    expect(repository.load("corn", 4)).toBe(first);
    expect((await first).scene.children.length).toBeGreaterThan(0);
    expect(read).toHaveBeenCalledTimes(1);
    read.mockRejectedValueOnce(new Error("Vault unavailable"));
    await expect(repository.load("tomato", 2)).rejects.toThrow("Vault unavailable");
    repository.retry();
    expect((await repository.load("tomato", 2)).scene.children.length).toBeGreaterThan(0);
    expect(repository.load("corn", 4)).toBe(first);
  });

  it("has a crop ready only once every stage, and its produce, have loaded", async () => {
    const read = vi.fn(async (filename: string) => {
      const bytes = readFileSync(`assets/crops/${filename}`);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    });
    const repository = new CropAssets(read);
    await repository.ready("coconut");
    expect(read.mock.calls.map(([name]) => name).sort()).toEqual([
      "Coconut_1.glb",
      "Coconut_2.glb",
      "Coconut_3.glb",
      "Coconut_4.glb",
      "Coconut_produce.glb",
    ]);
    await repository.ready("coconut");
    expect(read).toHaveBeenCalledTimes(5);
    await repository.ready("tomato");
    expect(read).toHaveBeenCalledTimes(9); // no produce model, so four more
    read.mockRejectedValueOnce(new Error("Vault unavailable"));
    await expect(repository.ready("corn")).rejects.toThrow("Vault unavailable");
  });
});
