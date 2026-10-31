import { useEffect, useMemo, useRef } from "react";
import type { SunClock } from "@/hooks/useSunClock";
import { BOARD_HEIGHT, BOARD_WIDTH, arcDots, boardPoint } from "@/lib/scene/clockBoard";
import { SUN_CLOCK } from "@/lib/scene/constants";
import { sunState, type SunState } from "@/lib/scene/sunClock";

interface ClockArcProps {
  clock: SunClock;
  /** The progress last reported by the timer, used for what is drawn before the first frame. */
  progress: number;
}

function sunTransform(state: SunState): string {
  const at = boardPoint(state.x, state.y);
  return `translate(${at.x} ${at.y}) scale(${state.scale})`;
}

/** The path of the sun as dots, and the sun itself, drawn in the page on a board that scales as one. */
export function ClockArc({ clock, progress }: ClockArcProps) {
  const dots = useMemo(arcDots, []);
  const initial = sunState(progress);
  const group = useRef<SVGGElement>(null);
  const layers = useRef<(SVGCircleElement | null)[]>([]);

  // The sun moves every frame from the animated state, not once a second from the props.
  useEffect(() => {
    function draw(state: SunState) {
      group.current?.setAttribute("transform", sunTransform(state));
      layers.current.forEach((layer, index) => {
        if (!layer) return;
        layer.setAttribute("fill", state.colorCss);
        layer.setAttribute(
          "fill-opacity",
          String(SUN_CLOCK.sunLayers[index].opacity * state.brightness),
        );
      });
    }
    draw(clock.sun.current);
    return clock.subscribe(draw);
  }, [clock]);

  return (
    <svg
      className="solanum-clock-arc"
      viewBox={`0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {dots.map((dot) => (
        <circle
          key={dot.index}
          cx={dot.x}
          cy={dot.y}
          r={dot.radius}
          fill="currentColor"
          fillOpacity={dot.opacity}
        />
      ))}
      <g ref={group} className="solanum-clock-sun" transform={sunTransform(initial)}>
        {SUN_CLOCK.sunLayers.map((layer, index) => (
          <circle
            key={layer.radius}
            ref={(circle) => {
              layers.current[index] = circle;
            }}
            r={layer.radius}
            fill={initial.colorCss}
            fillOpacity={layer.opacity * initial.brightness}
          />
        ))}
      </g>
    </svg>
  );
}
