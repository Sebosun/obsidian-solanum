import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { BufferGeometry, Mesh, MeshBasicMaterial } from "three";
import { createClockGlyph, layoutClock } from "@/lib/scene/clockGeometry";
import { SUN_CLOCK } from "@/lib/scene/constants";

interface ClockDigitsProps {
  text: string;
  size: number;
  color: string;
  /** Strength of a settled digit, 0 to 1. */
  opacity: number;
  reduced: boolean;
}

interface Slot {
  char: string;
  /** The character this slot is rolling away from, while it rolls. */
  outgoing: string | null;
}

const GLYPHS = "0123456789:?";
const easeOut = (k: number) => 1 - (1 - k) ** 3;

/** The time as separate glyphs, so only the digits that change roll over. */
export function ClockDigits({ text, size, color, opacity, reduced }: ClockDigitsProps) {
  const invalidate = useThree((state) => state.invalidate);
  const geometries = useMemo(() => {
    const made = new Map<string, BufferGeometry>();
    for (const char of GLYPHS) made.set(char, createClockGlyph(char, size));
    return made;
  }, [size]);
  useEffect(
    () => () => {
      for (const geometry of geometries.values()) geometry.dispose();
    },
    [geometries],
  );

  const [slots, setSlots] = useState<Slot[]>(() =>
    [...text].map((char) => ({ char, outgoing: null })),
  );
  const ages = useRef<number[]>([]);
  const incoming = useRef(new Map<number, Mesh>());
  const outgoing = useRef(new Map<number, Mesh>());

  useEffect(() => {
    setSlots((previous) =>
      [...text].map((char, index) => {
        const before = previous[index];
        if (reduced || before === undefined || before.char === char)
          return { char, outgoing: null };
        ages.current[index] = 0;
        return { char, outgoing: before.char };
      }),
    );
    invalidate();
  }, [text, reduced, invalidate]);

  useFrame((_frame, delta) => {
    const { seconds, travel } = SUN_CLOCK.digitRoll;
    let finished = false;
    let rolling = false;
    slots.forEach((slot, index) => {
      if (slot.outgoing === null) return;
      ages.current[index] = (ages.current[index] ?? 0) + Math.min(delta, 0.1);
      const k = Math.min(1, ages.current[index] / seconds);
      const eased = easeOut(k);
      const arriving = incoming.current.get(index);
      const leaving = outgoing.current.get(index);
      if (arriving) {
        arriving.position.y = (1 - eased) * travel;
        (arriving.material as MeshBasicMaterial).opacity = opacity * eased;
      }
      if (leaving) {
        leaving.position.y = -eased * travel;
        (leaving.material as MeshBasicMaterial).opacity = opacity * (1 - eased);
      }
      if (k >= 1) finished = true;
      else rolling = true;
    });
    if (finished)
      setSlots((current) =>
        current.map((slot, index) =>
          (ages.current[index] ?? 0) >= seconds ? { ...slot, outgoing: null } : slot,
        ),
      );
    if (rolling) invalidate();
  });

  const pens = layoutClock(text, size);
  const settled = (index: number) => slots[index]?.outgoing === null;
  return (
    <group name="clock-digit-row">
      {slots.map((slot, index) => (
        <group key={index} position={[pens[index] ?? 0, 0, 0]}>
          <mesh
            name={`clock-digit-${index}`}
            ref={(mesh) => {
              if (mesh) incoming.current.set(index, mesh);
              else incoming.current.delete(index);
            }}
            geometry={geometries.get(slot.char) ?? geometries.get("?")}
            position={[0, settled(index) ? 0 : SUN_CLOCK.digitRoll.travel, 0]}
          >
            <meshBasicMaterial
              color={color}
              transparent
              opacity={settled(index) ? opacity : 0}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          {slot.outgoing !== null && (
            <mesh
              name={`clock-digit-out-${index}`}
              ref={(mesh) => {
                if (mesh) outgoing.current.set(index, mesh);
                else outgoing.current.delete(index);
              }}
              geometry={geometries.get(slot.outgoing) ?? geometries.get("?")}
            >
              <meshBasicMaterial
                color={color}
                transparent
                opacity={opacity}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
