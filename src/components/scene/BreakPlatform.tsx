import { BREAK_SCENE } from "@/lib/scene/constants";

const RIM = { height: 0.25, bottomShrink: 0.84, below: 0.14 };

/** The little wooden platform the break sits on, shaped like the plot it replaces. */
export function BreakPlatform() {
  const { radius, rim, top, sides } = BREAK_SCENE.platform;
  return (
    <>
      <mesh name="break-platform-rim" position={[0, BREAK_SCENE.groundY - RIM.below, 0]}>
        <cylinderGeometry args={[radius, radius * RIM.bottomShrink, RIM.height, sides]} />
        <meshStandardMaterial color={rim} roughness={1} />
      </mesh>
      <mesh
        name="break-platform-top"
        position={[0, BREAK_SCENE.groundY, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[radius * 0.95, sides]} />
        <meshStandardMaterial color={top} roughness={0.95} />
      </mesh>
    </>
  );
}
