import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import type { CropId } from "../../lib/crops/catalog";
import { preparePlant } from "../../lib/crops/geometry";
import { clonePlantMaterials } from "../../lib/crops/materials";
import type { GrowthTransition } from "../../lib/scene/GrowthTransition";
import { useCropModel } from "../../hooks/useCropModel";

interface GrowthLayerProps {
  crop: CropId;
  stage: number;
  transition: GrowthTransition;
}

export function GrowthLayer({ crop, stage, transition }: GrowthLayerProps) {
  const { scene } = useCropModel(crop, stage);
  const { scene: mature } = useCropModel(crop, 4);
  const plant = useMemo(() => {
    const prepared = preparePlant(scene, mature);
    const materials = clonePlantMaterials(prepared.object);
    return { ...prepared, materials };
  }, [scene, mature]);
  const group = useRef<Group>(null);
  useEffect(() => {
    return () => plant.materials.forEach((material) => material.dispose());
  }, [plant]);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const layer = transition.sample(clock.elapsedTime).find((item) => item.stage === stage);
    group.current.visible = !!layer && layer.opacity > 0.001;
    if (!layer) return;
    group.current.scale.setScalar(plant.factor * layer.scale);
    for (const material of plant.materials) {
      material.opacity = layer.opacity;
      material.depthWrite = layer.opacity >= 0.999;
    }
  });
  return (
    <group ref={group} scale={plant.factor}>
      <primitive object={plant.object} dispose={null} />
    </group>
  );
}
