import { describe, expect, it, vi } from "vitest";
import ReactThreeTestRenderer from "@react-three/test-renderer";
import { Box3, Mesh, MeshBasicMaterial, OrthographicCamera, Vector3, type Object3D } from "three";
import { Pillow } from "@/components/models/Pillow";
import { BREAK_SCENE, TIMER_SCENE } from "@/lib/scene/constants";
import { fitTimerCamera } from "@/lib/scene/framing";
import { sunState } from "@/lib/scene/sunClock";
import { loadPillow } from "./helpers/catModel";

const model = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("@/hooks/useModel", () => ({ useModel: () => model.current }));

type Renderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
const find = (renderer: Renderer, name: string): Object3D =>
  renderer.scene.findByProps({ name }).instance;
const frames = (renderer: Renderer, count: number) =>
  ReactThreeTestRenderer.act(async () => {
    await renderer.advanceFrames(count, 0.05);
  });
const materialsOf = (root: Object3D) => {
  const found = new Set<MeshBasicMaterial>();
  root.traverse((node) => {
    if (node instanceof Mesh && node.material instanceof MeshBasicMaterial)
      found.add(node.material);
  });
  return [...found];
};

describe("the pillow in the scene", () => {
  it("is as wide as the scene says, sitting at the base height, where and how turned it says", async () => {
    model.current = await loadPillow();
    const renderer = await ReactThreeTestRenderer.create(<Pillow />);
    const pillow = find(renderer, "pillow");
    const { position, turn, width } = BREAK_SCENE.pillow;
    expect(pillow.position.toArray()).toEqual([position[0], BREAK_SCENE.groundY, position[1]]);
    expect(pillow.rotation.y).toBeCloseTo(turn, 6);
    const box = new Box3().setFromObject(pillow.children[0]);
    expect(box.getSize(new Vector3()).x).toBeCloseTo(width, 4);
    expect(box.min.y).toBeCloseTo(0, 4);
    await renderer.unmount();
  });

  it("lays whatever rests on it on the floor of its dish, not on its rim or on the ground", async () => {
    model.current = await loadPillow();
    const renderer = await ReactThreeTestRenderer.create(
      <Pillow>
        <mesh name="sleeper" />
      </Pillow>,
    );
    const floor = find(renderer, "pillow-floor");
    const top = new Box3().setFromObject(find(renderer, "pillow").children[0]).max.y;
    expect(floor.position.y).toBeGreaterThan(0.05);
    expect(floor.position.y).toBeLessThan(top);
    expect(floor.getObjectByName("sleeper")).toBeDefined();
    await renderer.unmount();
  });

  it("keeps its baked colours out of tone mapping and dims, but not to black, as the light fades", async () => {
    model.current = await loadPillow();
    const daylight = { current: sunState(0) };
    const renderer = await ReactThreeTestRenderer.create(<Pillow daylightRef={daylight} />);
    const [material] = materialsOf(find(renderer, "pillow"));
    expect(material.toneMapped).toBe(false);
    await frames(renderer, 2);
    const day = material.color.r;
    daylight.current = sunState(1);
    await frames(renderer, 2);
    expect(material.color.r).toBeLessThan(day);
    expect(material.color.r).toBeGreaterThan(0.3);
    await renderer.unmount();
  });
});

describe("where the break's parts stand on the screen", () => {
  // The camera looks from the +X, +Z side, so its right-hand direction on the ground is this one.
  const right = new Vector3(0.8, 0, -0.6);
  const onScreen = (position: readonly [number, number]) =>
    new Vector3(position[0], 0, position[1]).dot(right);

  it("has the cat's pillow on the left and the mug on the right", () => {
    expect(onScreen(BREAK_SCENE.pillow.position)).toBeLessThan(0);
    expect(onScreen(BREAK_SCENE.mug.position)).toBeGreaterThan(0);
    expect(
      onScreen(BREAK_SCENE.mug.position) - onScreen(BREAK_SCENE.pillow.position),
    ).toBeGreaterThan(BREAK_SCENE.pillow.width / 2);
  });

  it("turns the cat's face towards the camera, so he can be seen", () => {
    // The cat faces +X in its own space; turned about the vertical, that is (cos, 0, -sin).
    const heading = BREAK_SCENE.pillow.turn + BREAK_SCENE.cat.turn;
    const face = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
    const towardCamera = new Vector3(
      TIMER_SCENE.direction[0],
      0,
      TIMER_SCENE.direction[2],
    ).normalize();
    // Close enough to look at us, not so square-on that he loses his shape.
    expect(face.angleTo(towardCamera)).toBeLessThan(0.45);
  });

  it.each([
    [520, 760],
    [420, 300],
    [900, 900],
  ])("keeps the pillow, the cat and the mug on screen at %ix%i", (width, height) => {
    const camera = new OrthographicCamera();
    fitTimerCamera(camera, { width, height }, BREAK_SCENE.bounds, BREAK_SCENE.center);
    const { pillow, mug, groundY } = BREAK_SCENE;
    const inView = (x: number, y: number, z: number) => {
      const point = new Vector3(x, y, z).project(camera);
      expect(Math.abs(point.x)).toBeLessThan(0.96);
      expect(Math.abs(point.y)).toBeLessThan(0.96);
    };
    // The bed's four corners, the cat above it, and the mug with its steam above that.
    for (const dx of [-1, 1])
      for (const dz of [-1, 1]) {
        const half = pillow.width / 2;
        inView(
          pillow.position[0] +
            dx * half * Math.cos(pillow.turn) +
            dz * half * 0.7 * Math.sin(pillow.turn),
          groundY,
          pillow.position[1] -
            dx * half * Math.sin(pillow.turn) +
            dz * half * 0.7 * Math.cos(pillow.turn),
        );
      }
    inView(pillow.position[0], groundY + 0.6, pillow.position[1]);
    inView(mug.position[0], groundY + mug.hover, mug.position[1]);
    inView(mug.position[0], groundY + mug.hover + mug.height + 0.5, mug.position[1]);
  });
});
