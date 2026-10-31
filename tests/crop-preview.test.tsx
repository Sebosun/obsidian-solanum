import { describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { CropPreview } from "@/components/models/CropPreview";
import { GROWTH_MOTION } from "@/lib/scene/constants";

vi.mock("@/components/models/Plant", () => ({
  Plant: ({ crop, stage, harvested }: { crop: string; stage: number; harvested?: boolean }) => (
    <mesh name={`plant-${crop}-${stage}-${harvested ? "harvested" : "growing"}`} />
  ),
}));
vi.mock("@/state/cropAssets", () => ({
  getCropAssets: () => ({ preload: vi.fn() }),
}));
vi.mock("@/state/hooks", () => ({ useServices: () => ({}) }));

describe("the preview of what a crop will become", () => {
  it("shows the finished, harvested crop rather than a seed or a sprout", async () => {
    const renderer = await ReactThreeTestRenderer.create(<CropPreview crop="coconut" />);
    expect(
      renderer.scene.findAll((node) => node.instance.name === "plant-coconut-4-harvested"),
    ).toHaveLength(1);
    expect(renderer.scene.findAll((node) => /-(0|1|2|3)-/.test(node.instance.name))).toHaveLength(
      0,
    );
    await renderer.unmount();
  });

  it("stands where a growing crop stands, so starting does not make it jump", async () => {
    const renderer = await ReactThreeTestRenderer.create(<CropPreview crop="tomato" />);
    const group = renderer.scene.findByProps({ name: "crop-preview" }).instance;
    expect(group.position.toArray()).toEqual([...GROWTH_MOTION.basePosition]);
    await renderer.unmount();
  });
});
