import { useEffect, useMemo, useRef } from "react";
import type { SunClock } from "@/hooks/useSunClock";
import { BOARD_WIDTH, arcDots, boardHeight, boardPoint } from "@/lib/scene/clockBoard";
import { SUN_CLOCK } from "@/lib/scene/constants";
import { sunState, type SunState } from "@/lib/scene/sunClock";

interface ClockArcProps {
  clock: SunClock;
  /** The progress last reported by the timer, used for what is drawn before the first frame. */
  progress: number;
  /** How much taller (above 1) or flatter (below 1) than a half circle the arc is drawn. */
  stretch: number;
}

function sunTransform(state: SunState, stretch: number): string {
  const at = boardPoint(state.x, state.y, stretch);
  return `translate(${at.x} ${at.y}) scale(${state.scale})`;
}

/** The path of the sun as dots, and the sun itself, drawn in the page on a board that scales as one. */
export function ClockArc({ clock, progress, stretch }: ClockArcProps) {
  const dots = useMemo(() => arcDots(stretch), [stretch]);
  const initial = sunState(progress);
  const group = useRef<SVGGElement>(null);
  const layers = useRef<(SVGCircleElement | null)[]>([]);

  // The sun moves every frame from the animated state, not once a second from the props.
  useEffect(() => {
    function draw(state: SunState) {
      group.current?.setAttribute("transform", sunTransform(state, stretch));
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
  }, [clock, stretch]);

  return (
    <svg
      className="solanum-clock-arc"
      viewBox={`0 0 ${BOARD_WIDTH} ${boardHeight(stretch)}`}
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
      <g ref={group} className="solanum-clock-sun" transform={sunTransform(initial, stretch)}>
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
