import { useEffect, useId, useRef } from "react";
import { SrLabel } from "@/components/app/SrLabel";
import type { SunClock } from "@/hooks/useSunClock";
import { sunState, type SunState } from "@/lib/scene/sunClock";

interface ProgressBarProps {
  /** The animated sun, whose progress the bar follows frame by frame. */
  clock: SunClock;
  /** The progress last reported by the timer, 0 to 1. */
  progress: number;
  label: string;
}

function draw(fill: HTMLElement, state: SunState) {
  fill.style.transform = `scaleX(${state.progress})`;
  fill.style.backgroundColor = state.colorCss;
}

/**
 * A thin bar along the bottom of a view that fills as a phase runs out. It moves a little every
 * frame, and takes the sun's colour as it goes, warming from dawn towards dusk.
 */
export function ProgressBar({ clock, progress, label }: ProgressBarProps) {
  const labelId = useId();
  const fill = useRef<HTMLDivElement>(null);
  const initial = sunState(progress);
  useEffect(() => {
    const element = fill.current;
    if (!element) return;
    draw(element, clock.sun.current);
    return clock.subscribe((state) => draw(element, state));
  }, [clock]);
  return (
    <div
      className="solanum-progress"
      role="progressbar"
      aria-labelledby={labelId}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(initial.progress * 100)}
    >
      <SrLabel id={labelId}>{label}</SrLabel>
      <div
        ref={fill}
        className="solanum-progress-fill"
        style={{ transform: `scaleX(${initial.progress})`, backgroundColor: initial.colorCss }}
      />
    </div>
  );
}
