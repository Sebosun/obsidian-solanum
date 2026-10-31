import { describe, expect, it } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import type { Object3D } from "three";
import { EmptyPlots } from "@/components/models/EmptyPlots";
import { layoutHarvestBlocks } from "@/lib/harvest/month";
import { HARVEST_BLOCKS } from "@/lib/scene/constants";

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const plots = (renderer: Renderer): Object3D[] =>
  renderer.scene
    .findAll((node) => node.instance.name === "empty-plot")
    .map((node) => node.instance);

describe("the empty plots of a month with nothing in it", () => {
  const empty = layoutHarvestBlocks([], new Date(2026, 10, 1));

  it("are one for every place a harvest would stand, in the same grid", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <EmptyPlots columns={empty.columns} rows={empty.rows} season="summer" />,
    );
    const found = plots(renderer);
    expect(found).toHaveLength(empty.columns * empty.rows);
    const pitch = HARVEST_BLOCKS.pitch;
    const xs = new Set(found.map((plot) => plot.position.x.toFixed(4)));
    const zs = new Set(found.map((plot) => plot.position.z.toFixed(4)));
    expect(xs.size).toBe(empty.columns);
    expect(zs.size).toBe(empty.rows);
    // Centred on the plinth, one pitch apart.
    expect(Math.max(...found.map((plot) => plot.position.x))).toBeCloseTo(
      ((empty.columns - 1) / 2) * pitch,
      4,
    );
    expect(Math.min(...found.map((plot) => plot.position.z))).toBeCloseTo(
      (-(empty.rows - 1) / 2) * pitch,
      4,
    );
    await renderer.unmount();
  });

  it("lie low, below where the shortest harvest would reach, so they read as empty", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <EmptyPlots columns={3} rows={2} season="autumn" />,
    );
    for (const plot of plots(renderer)) {
      expect(plot.position.y).toBeGreaterThanOrEqual(0);
      expect(plot.position.y).toBeLessThan(HARVEST_BLOCKS.minHeight);
    }
    await renderer.unmount();
  });

  it("are topped in the season's colour, which snow turns white", async () => {
    const colourOf = async (season: "winter" | "summer") => {
      const renderer = await ReactThreeTestRenderer.create(
        <EmptyPlots columns={1} rows={1} season={season} />,
      );
      const top = renderer.scene.findByProps({ name: "empty-plot-top" }).instance as unknown as {
        material: { color: { getHexString(): string } };
      };
      const hex = top.material.color.getHexString();
      await renderer.unmount();
      return hex;
    };
    expect(await colourOf("winter")).not.toBe(await colourOf("summer"));
  });

  it("make no plots for a grid with no room", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <EmptyPlots columns={0} rows={0} season="summer" />,
    );
    expect(plots(renderer)).toHaveLength(0);
    await renderer.unmount();
  });
});
