import { useRef, type CSSProperties } from "react";
import { ClockReadout } from "@/components/clock/ClockReadout";
import { useClockFont } from "@/components/clock/useClockFont";
import { CLOCK_DIGITS } from "@/lib/scene/constants";
import { formatTime } from "@/lib/time";

interface TimeHeaderProps {
  remaining: number;
  reduced: boolean;
  /** A few words in small type above the time, such as the name of the phase. */
  caption?: string;
}

interface HeaderStyle extends CSSProperties {
  "--digit-opacity": number;
  "--flip-seconds": string;
}

/** How solid the digits are: they sit behind the scene, so they stay a little faint. */
const DIGIT_OPACITY = 0.62;

const STYLE: HeaderStyle = {
  "--digit-opacity": DIGIT_OPACITY,
  "--flip-seconds": `${CLOCK_DIGITS.flip.seconds}s`,
};

/** The time left, centred at the top of a view, in fixed-width digits that flip like a flip clock. */
export function TimeHeader({ remaining, reduced, caption }: TimeHeaderProps) {
  const header = useRef<HTMLDivElement>(null);
  useClockFont(header);
  return (
    <div ref={header} className="solanum-time-header" aria-hidden="true">
      {caption && <p className="solanum-time-caption">{caption}</p>}
      <ClockReadout text={formatTime(remaining)} reduced={reduced} style={STYLE} />
    </div>
  );
}
