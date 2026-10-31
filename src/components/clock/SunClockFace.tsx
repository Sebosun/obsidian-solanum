import { useMemo, useRef, type CSSProperties } from "react";
import { ClockArc } from "@/components/clock/ClockArc";
import { ClockReadout } from "@/components/clock/ClockReadout";
import { useElementSize } from "@/hooks/useElementSize";
import type { SunClock } from "@/hooks/useSunClock";
import { BOARD_WIDTH, boardLayout, digitCenterFraction, ringStretch } from "@/lib/scene/clockBoard";
import { SUN_CLOCK } from "@/lib/scene/constants";
import { sunState } from "@/lib/scene/sunClock";
import { formatTime } from "@/lib/time";
import fontUrl from "@assets/fonts/bricolage-grotesque-digits.woff2";

interface SunClockFaceProps {
  clock: SunClock;
  /** The progress last reported by the timer. */
  progress: number;
  /** Milliseconds left, shown as the large faint digits. */
  remaining: number;
  reduced: boolean;
}

/** Custom properties the stylesheet turns into sizes relative to the scene. */
interface BoardStyle extends CSSProperties {
  "--board-aspect": number;
  "--board-lift": number;
  "--board-width": number;
  "--board-max": number;
  "--baseline": number;
  "--digit-center": number;
}
interface ReadoutStyle extends CSSProperties {
  "--digit-em": number;
  "--digit-opacity": number;
  "--roll-travel": number;
  "--roll-seconds": string;
}

const FONT_FACE = `@font-face{font-family:"Solanum Clock";font-weight:700;font-style:normal;font-display:block;src:url(${fontUrl}) format("woff2")}`;
function boardStyle(stretch: number): BoardStyle {
  const layout = boardLayout(stretch);
  return {
    "--board-aspect": layout.aspect,
    "--board-lift": layout.lift,
    "--board-width": layout.widthInScenes,
    "--board-max": layout.maxWidthInHeights,
    "--baseline": SUN_CLOCK.baselineFraction,
    "--digit-center": digitCenterFraction(stretch),
  };
}

/**
 * The countdown as weather, drawn in the page behind the transparent 3D scene so that nothing in
 * the scene, such as particles, can ever cross it. Everything is sized from the scene, so the
 * ring and the digits scale with its resolution.
 */
export function SunClockFace({ clock, progress, remaining, reduced }: SunClockFaceProps) {
  const sky = useRef<HTMLDivElement>(null);
  const size = useElementSize(sky);
  // The ring fills the scene's width and takes its height from the scene's shape.
  const stretch = ringStretch(size.width, size.height);
  const style = useMemo(() => boardStyle(stretch), [stretch]);
  const { start, end } = SUN_CLOCK.digitOpacity;
  const readoutStyle: ReadoutStyle = {
    "--digit-em": (SUN_CLOCK.digitSize / BOARD_WIDTH) * 100,
    "--digit-opacity": start + (end - start) * sunState(progress).progress,
    "--roll-travel": SUN_CLOCK.digitRoll.travel,
    "--roll-seconds": `${SUN_CLOCK.digitRoll.seconds}s`,
  };
  return (
    <div ref={sky} className="solanum-sky" aria-hidden="true">
      <style>{FONT_FACE}</style>
      <div className="solanum-sky-board" style={style}>
        <ClockArc clock={clock} progress={progress} stretch={stretch} />
        <ClockReadout text={formatTime(remaining)} reduced={reduced} style={readoutStyle} />
      </div>
    </div>
  );
}
