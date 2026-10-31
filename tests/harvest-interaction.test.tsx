import { describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { buildHarvestMonth } from "../src/lib/harvest/model";
import { HarvestDayPlot } from "../src/components/harvest/HarvestDayPlot";

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
        active={false}
        assetUrl={(s) => s}
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
});
