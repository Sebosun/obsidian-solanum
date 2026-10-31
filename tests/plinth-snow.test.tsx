import { describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Box3, Mesh, MeshStandardMaterial, type Object3D } from "three";
import { Plinth } from "@/components/models/Plinth";
import { SnowMounds } from "@/components/models/SnowMounds";
import { SeasonPlatform } from "@/components/stage/SeasonPlatform";
import { SEASON_THEMES } from "@/lib/scene/seasons";
import { SNOW_MOUNDS } from "@/lib/models/snow";
import { FARM_PLATFORM } from "@/lib/models/platform";

// The platform model has its own tests; here it is only what the snow sits on.
vi.mock("@/components/models/FarmPlatform", () => ({ FarmPlatform: () => null }));

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const named = (renderer: Renderer, name: string): Object3D =>
  renderer.scene.findByProps({ name }).instance;

describe("the plinth under a harvest view", () => {
  it("is a slab of the footprint it was given, with its top at the ground", async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <Plinth name="test-plinth" width={7} depth={4} />,
    );
    const slab = named(renderer, "test-plinth");
    slab.updateWorldMatrix(true, true);
    const box = new Box3().setFromObject(slab);
    expect(box.max.y).toBeCloseTo(0, 6);
    expect(box.min.y).toBeLessThan(0);
    expect(box.max.x - box.min.x).toBeCloseTo(7, 6);
    expect(box.max.z - box.min.z).toBeCloseTo(4, 6);
    await renderer.unmount();
  });

  it("looks the same wherever it stands: one colour for the month and the year", async () => {
    const colours: string[] = [];
    for (const name of ["month-plinth", "year-plinth"]) {
      const renderer = await ReactThreeTestRenderer.create(
        <Plinth name={name} width={3} depth={3} />,
      );
      const mesh = named(renderer, name);
      if (!(mesh instanceof Mesh) || !(mesh.material instanceof MeshStandardMaterial))
        throw new Error("The plinth is a standard mesh");
      colours.push(mesh.material.color.getHexString());
      await renderer.unmount();
    }
    expect(colours[0]).toBe(colours[1]);
  });
});

describe("snow on the plot", () => {
  it("heaps one flattened mound for each bank, lying on the planting surface", async () => {
    const renderer = await ReactThreeTestRenderer.create(<SnowMounds color="#eef4fb" />);
    const mounds = named(renderer, "snow-cover").children;
    expect(mounds).toHaveLength(SNOW_MOUNDS.length);
    mounds.forEach((mound, index) => {
      const { x, z } = SNOW_MOUNDS[index];
      expect([mound.position.x, mound.position.z]).toEqual([x, z]);
      expect(mound.position.y).toBeCloseTo(FARM_PLATFORM.plantingSurfaceY, 6);
      expect(mound.scale.y).toBeLessThan(mound.scale.x);
    });
    await renderer.unmount();
  });

  it("is added by the season platform only when the season brings snow, in the platform's colour", async () => {
    const winter = await ReactThreeTestRenderer.create(
      <SeasonPlatform theme={SEASON_THEMES.winter} />,
    );
    const mound = named(winter, "snow-cover").children[0];
    if (!(mound instanceof Mesh) || !(mound.material instanceof MeshStandardMaterial))
      throw new Error("A mound is a standard mesh");
    expect(`#${mound.material.color.getHexString()}`).toBe(SEASON_THEMES.winter.platform.top);
    await winter.unmount();

    const summer = await ReactThreeTestRenderer.create(
      <SeasonPlatform theme={SEASON_THEMES.summer} />,
    );
    expect(summer.scene.findAll((node) => node.instance.name === "snow-cover")).toHaveLength(0);
    await summer.unmount();
  });
});
