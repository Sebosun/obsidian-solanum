import { describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { buildHarvestMonth } from "@/lib/harvest/model";
import { HarvestDayPlot } from "@/components/harvest/HarvestDayPlot";
import { Mesh, MeshStandardMaterial } from "three";
import type { SeasonId } from "@/lib/scene/seasons";

vi.mock("@react-three/drei", () => ({ Html: () => null, useGLTF: vi.fn() }));

describe("3D plot pointer interaction", () => {
  it("routes hover, leave and click from the rendered scene to the correct calendar day", async () => {
    const day = buildHarvestMonth([], new Date(2026, 9, 1))[0];
    const onHover = vi.fn();
    const onSelect = vi.fn();
    const stopPropagation = vi.fn();
    const renderer = await ReactThreeTestRenderer.create(
      <HarvestDayPlot
        day={day}
        hovered={false}
        selected={false}
        season="summer"
        index={0}
        reduced
        onHover={onHover}
        onSelect={onSelect}
      />,
    );
    try {
      const group = renderer.scene.findByProps({ name: `day-${day.key}` });
      await renderer.fireEvent(group, "pointerOver", { stopPropagation });
      expect(onHover).toHaveBeenLastCalledWith("2026-10-01");
      await renderer.fireEvent(group, "click", { stopPropagation });
      expect(onSelect).toHaveBeenCalledWith("2026-10-01");
      await renderer.fireEvent(group, "pointerOut", { stopPropagation });
      expect(onHover).toHaveBeenLastCalledWith(null);
      expect(stopPropagation).toHaveBeenCalledTimes(3);
    } finally {
      await renderer.unmount();
    }
  });

  it("dusts empty plots with snow in winter and warms them in summer", async () => {
    const day = buildHarvestMonth([], new Date(2026, 9, 1))[0];
    async function soilColorIn(season: SeasonId) {
      const renderer = await ReactThreeTestRenderer.create(
        <HarvestDayPlot
          day={day}
          hovered={false}
          selected={false}
          season={season}
          index={0}
          reduced
          onHover={vi.fn()}
          onSelect={vi.fn()}
        />,
      );
      const soil = renderer.scene.findByProps({ name: `soil-${day.key}` }).instance;
      if (!(soil instanceof Mesh) || !(soil.material instanceof MeshStandardMaterial))
        throw new Error("soil is not a standard mesh");
      const { r, g, b } = soil.material.color;
      await renderer.unmount();
      return { r, g, b, brightness: (r + g + b) / 3 };
    }
    const winter = await soilColorIn("winter");
    const summer = await soilColorIn("summer");
    expect(winter.brightness).toBeGreaterThan(summer.brightness + 0.15);
    expect(winter.b).toBeGreaterThan(winter.r);
  });

  it("raises plots into place a beat apart, and leaves them standing", async () => {
    const days = buildHarvestMonth([], new Date(2026, 9, 1));
    const plot = (index: number) => (
      <HarvestDayPlot
        key={index}
        day={days[index]}
        hovered={false}
        selected={false}
        season="summer"
        index={index}
        reduced={false}
        onHover={vi.fn()}
        onSelect={vi.fn()}
      />
    );
    const renderer = await ReactThreeTestRenderer.create(
      <>
        {plot(0)}
        {plot(20)}
      </>,
    );
    const scaleOf = (index: number) =>
      renderer.scene.findByProps({ name: `day-${days[index].key}` }).instance.scale.x;
    expect(scaleOf(0)).toBeLessThan(0.01);
    expect(scaleOf(20)).toBeLessThan(0.01);
    await ReactThreeTestRenderer.act(async () => {
      await renderer.advanceFrames(4, 0.05);
    });
    expect(scaleOf(0)).toBeGreaterThan(0.3);
    expect(scaleOf(20)).toBeLessThan(0.01);
    await ReactThreeTestRenderer.act(async () => {
      await renderer.advanceFrames(30, 0.05);
    });
    expect(scaleOf(0)).toBe(1);
    expect(scaleOf(20)).toBe(1);
    await renderer.unmount();
  });
});
