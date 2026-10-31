import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { CROPS, type CropId } from "../../lib/crops/catalog";
import { preparePlant } from "../../lib/crops/geometry";
import { clonePlantMaterials } from "../../lib/crops/materials";
import type { GrowthTransition } from "../../lib/scene/GrowthTransition";

interface GrowthLayerProps {
  crop: CropId;
  stage: number;
  assetUrl: (file: string) => string;
  transition: GrowthTransition;
}

export function GrowthLayer({ crop, stage, assetUrl, transition }: GrowthLayerProps) {
  const model = CROPS[crop].model;
  const { scene } = useGLTF(assetUrl(`${model}_${stage}.glb`));
  const { scene: mature } = useGLTF(assetUrl(`${model}_4.glb`));
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
