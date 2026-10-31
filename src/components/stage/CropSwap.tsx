import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import type { CropId } from "@/lib/crops/catalog";
import { swapFrame } from "@/lib/scene/motion";

interface CropSwapProps {
  crop: CropId;
  reduced: boolean;
  children(crop: CropId): ReactNode;
}

interface SwapItem {
  id: number;
  crop: CropId;
  entering: boolean;
  leaving: boolean;
}

/** Longest simulated step, so a stalled frame cannot skip the animation. */
const MAX_STEP_SECONDS = 0.05;
/** A scale of exactly zero would make the group's matrix singular. */
const MIN_SCALE = 0.0001;

/** Keeps the previous crop on screen just long enough to shrink away as the new one pops in. */
export function CropSwap({ crop, reduced, children }: CropSwapProps) {
  const invalidate = useThree((state) => state.invalidate);
  const [items, setItems] = useState<SwapItem[]>([
    { id: 0, crop, entering: false, leaving: false },
  ]);
  const latest = useRef(items);
  const nextId = useRef(1);
  const ages = useRef(new Map<number, number>());
  const groups = useRef(new Map<number, Group>());

  useEffect(() => {
    const current = latest.current;
    if (current.find((item) => !item.leaving)?.crop === crop) return;
    const incoming: SwapItem = { id: nextId.current++, crop, entering: !reduced, leaving: false };
    let next = [incoming];
    if (!reduced) {
      next = [
        ...current.map((item) => (item.leaving ? item : { ...item, leaving: true })),
        incoming,
      ];
      for (const item of next)
        if (!ages.current.has(item.id) || item.leaving) ages.current.set(item.id, 0);
    }
    latest.current = next;
    setItems(next);
    invalidate();
  }, [crop, reduced, invalidate]);

  useFrame((_state, delta) => {
    const step = Math.min(delta, MAX_STEP_SECONDS);
    let animating = false;
    let changed = false;
    const survivors: SwapItem[] = [];
    for (const item of latest.current) {
      if (!item.entering && !item.leaving) {
        survivors.push(item);
        continue;
      }
      const age = (ages.current.get(item.id) ?? 0) + step;
      ages.current.set(item.id, age);
      const frame = swapFrame(item.leaving ? "out" : "in", age, reduced);
      const group = groups.current.get(item.id);
      if (group) {
        group.scale.setScalar(Math.max(MIN_SCALE, frame.scale));
        group.rotation.y = frame.spin;
      }
      if (item.leaving && frame.done) {
        changed = true;
        ages.current.delete(item.id);
        continue;
      }
      if (item.entering && frame.done) {
        changed = true;
        survivors.push({ ...item, entering: false });
        continue;
      }
      animating = true;
      survivors.push(item);
    }
    if (changed) {
      latest.current = survivors;
      setItems(survivors);
    }
    if (animating) invalidate();
  });

  function register(id: number, group: Group | null) {
    if (group) groups.current.set(id, group);
    else groups.current.delete(id);
  }

  return (
    <>
      {items.map((item) => (
        <group
          key={item.id}
          name={`crop-swap-${item.crop}`}
          ref={(group) => register(item.id, group)}
          scale={item.entering ? MIN_SCALE : 1}
        >
          {children(item.crop)}
        </group>
      ))}
    </>
  );
}
