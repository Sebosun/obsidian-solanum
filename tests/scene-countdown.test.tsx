import { describe, expect, it } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { SceneCountdown } from "../src/components/scene/SceneCountdown";
import { countdownSegments } from "../src/lib/scene/countdown";

describe("countdown geometry", () => {
  it("renders and updates real Three.js digits rather than an HTML overlay", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <SceneCountdown remaining={25 * 60_000} color="#fff" />,
    );
    try {
      expect(renderer.scene.findAllByType("Mesh")).toHaveLength(24);
      await renderer.update(<SceneCountdown remaining={24 * 60_000 + 59_000} color="#fff" />);
      expect(renderer.scene.findAllByType("Mesh")).toHaveLength(22);
    } finally {
      await renderer.unmount();
    }
  });

  it("centers long presets, rounds partial seconds up, and clamps expiration", () => {
    expect(countdownSegments(120 * 60_000).text).toBe("120:00");
    expect(countdownSegments(1).text).toBe("00:01");
    expect(countdownSegments(-1).text).toBe("00:00");
    const { segments } = countdownSegments(120 * 60_000);
    const left = Math.min(...segments.map((segment) => segment.x - segment.width / 2));
    const right = Math.max(...segments.map((segment) => segment.x + segment.width / 2));
    expect(left + right).toBeCloseTo(0);
  });
});
