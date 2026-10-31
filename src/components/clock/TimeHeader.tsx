import type { CSSProperties } from "react";
import { ClockReadout } from "@/components/clock/ClockReadout";
import { CLOCK_DIGITS } from "@/lib/scene/constants";
import { formatTime } from "@/lib/time";
import fontUrl from "@assets/fonts/bricolage-grotesque-digits.woff2";

interface TimeHeaderProps {
  remaining: number;
  reduced: boolean;
  /** A few words in small type above the time, such as the name of the phase. */
  caption?: string;
}

interface HeaderStyle extends CSSProperties {
  "--digit-opacity": number;
  "--roll-travel": number;
  "--roll-seconds": string;
}

const STYLE: HeaderStyle = {
  "--digit-opacity": 0.62,
  "--roll-travel": CLOCK_DIGITS.roll.travel,
  "--roll-seconds": `${CLOCK_DIGITS.roll.seconds}s`,
};

/** The clock's own typeface, bundled into the plugin as a data URL: nothing is fetched. */
const FONT_FACE = `@font-face{font-family:"Solanum Clock";font-weight:700;font-style:normal;font-display:block;src:url(${fontUrl}) format("woff2")}`;

/** The time left, centred at the top of a view, in rolling fixed-width digits. */
export function TimeHeader({ remaining, reduced, caption }: TimeHeaderProps) {
  return (
    <div className="solanum-time-header" aria-hidden="true">
      <style>{FONT_FACE}</style>
      {caption && <p className="solanum-time-caption">{caption}</p>}
      <ClockReadout text={formatTime(remaining)} reduced={reduced} style={STYLE} />
    </div>
  );
}
