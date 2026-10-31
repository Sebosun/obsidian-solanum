import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { CropAssets } from "../src/lib/crops/CropAssets";

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
});
