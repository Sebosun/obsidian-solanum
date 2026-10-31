import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Group } from "three";
import { CROPS, type CropId } from "../../lib/crops/catalog";

export function Plant({ crop, stage, assetUrl, moving = false, scale = 1 }: {
  crop: CropId; stage: number; assetUrl: (name: string) => string; moving?: boolean; scale?: number;
}) {
  const model = CROPS[crop].model;
  const { scene } = useGLTF(assetUrl(`${model}_${Math.max(1, stage)}.glb`));
  const { scene: mature } = useGLTF(assetUrl(`${model}_4.glb`));
  const { object, factor } = useMemo(() => {
    const object = scene.clone(true);
    const box = new Box3().setFromObject(object);
    object.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    const size = new Box3().setFromObject(mature).getSize(new Vector3());
    return { object, factor: 1.8 / Math.max(size.x, size.y, size.z, .001) };
  }, [scene, mature]);
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.z = moving ? Math.sin(clock.elapsedTime * 1.3) * .025 : 0;
  });
  return <group ref={group} scale={scale * factor}><primitive object={object} dispose={null} /></group>;
}
