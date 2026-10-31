import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import type { CropId } from "@/lib/crops/catalog";
import { GrowthTransition } from "@/lib/scene/GrowthTransition";
import { GrowthLayer } from "@/components/scene/GrowthLayer";
import { GrowthSeed } from "@/components/scene/GrowthSeed";
import { getCropAssets } from "@/state/cropAssets";
import { useServices } from "@/state/hooks";

interface GrowingCropProps {
  crop: CropId;
  stage: number;
  moving: boolean;
  reduced: boolean;
}

export function GrowingCrop({ crop, stage, moving, reduced }: GrowingCropProps) {
  const assets = getCropAssets(useServices());
  const transition = useRef(new GrowthTransition(stage)).current;
  const clock = useThree((state) => state.clock);
  const invalidate = useThree((state) => state.invalidate);
  const group = useRef<Group>(null);
  const [stages, setStages] = useState([stage]);
  const retained = useRef([stage]);

  useEffect(() => {
    assets.preload(crop);
  }, [crop, assets]);

  useEffect(() => {
    const now = clock.getElapsedTime();
    transition.retarget(stage, now, reduced);
    retained.current = transition.sample(now).map((layer) => layer.stage);
    setStages(retained.current);
    invalidate();
  }, [stage, reduced, transition, clock, invalidate]);

  useFrame(() => {
    if (group.current)
      group.current.rotation.z = moving ? Math.sin(clock.elapsedTime * 1.3) * 0.025 : 0;
    const layers = transition.sample(clock.elapsedTime);
    if (layers.length > 1) invalidate();
    else if (retained.current.length > 1) {
      retained.current = [layers[0].stage];
      setStages(retained.current);
    }
  });

  return (
    <group ref={group} position={[0, -0.55, 0]}>
      {stages.map((value) =>
        value === 0 ? (
          <GrowthSeed key={value} transition={transition} />
        ) : (
          <GrowthLayer key={value} stage={value} crop={crop} transition={transition} />
        ),
      )}
    </group>
  );
}
