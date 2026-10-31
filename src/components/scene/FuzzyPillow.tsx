import { useEffect, useMemo, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { createFuzzShared, createFuzzShell } from "@/lib/scene/fuzz";
import { pillowGeometry } from "@/lib/scene/pillow";
import type { SunState } from "@/lib/scene/sunClock";

interface FuzzyPillowProps {
  /** The sun as animated frame by frame; the pillow dims as the light fades. */
  daylightRef?: MutableRefObject<SunState>;
}

const FUR = {
  shells: 18,
  root: "#d4924f",
  /** The colour of the cushion under the fur, which shows where the fur is thin. */
  shadow: "#8f5a30",
  tip: "#f6cf98",
  density: 62,
  length: 0.034,
  /** Never darker than this share of its daytime colour, so the pillow stays soft at dusk. */
  dimmest: 0.5,
};

/** A soft, warm, fuzzy pillow: a plump cushion wrapped in layers of fur. */
export function FuzzyPillow({ daylightRef }: FuzzyPillowProps) {
  const { width, depth, height, turn, position } = BREAK_SCENE.pillow;
  const geometry = useMemo(() => pillowGeometry({ width, depth, height }), [width, depth, height]);
  const shared = useMemo(createFuzzShared, []);
  const shells = useMemo(
    () =>
      Array.from({ length: FUR.shells }, (_, i) =>
        createFuzzShell((i + 1) / FUR.shells, shared, FUR),
      ),
    [shared],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      shells.forEach((shell) => shell.dispose());
    },
    [geometry, shells],
  );
  useFrame(() => {
    const light = daylightRef?.current.lightFactor ?? 1;
    shared.uBrightness.value = FUR.dimmest + (1 - FUR.dimmest) * Math.min(1, light);
  });
  return (
    <group
      name="fuzzy-pillow"
      position={[position[0], BREAK_SCENE.groundY, position[1]]}
      rotation={[0, turn, 0]}
    >
      <mesh geometry={geometry}>
        <meshStandardMaterial color={FUR.shadow} roughness={1} />
      </mesh>
      {shells.map((material, index) => (
        <mesh key={index} name="pillow-fur" geometry={geometry} material={material} />
      ))}
    </group>
  );
}
