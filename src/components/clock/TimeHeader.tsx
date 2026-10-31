import type { CSSProperties } from "react";
import { ClockReadout } from "@/components/clock/ClockReadout";
import { SUN_CLOCK } from "@/lib/scene/constants";
import { formatTime } from "@/lib/time";

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
  "--roll-travel": SUN_CLOCK.digitRoll.travel,
  "--roll-seconds": `${SUN_CLOCK.digitRoll.seconds}s`,
};

/** The time left, centred at the top of a view, in the same rolling digits as the sun clock. */
export function TimeHeader({ remaining, reduced, caption }: TimeHeaderProps) {
  return (
    <div className="solanum-time-header" aria-hidden="true">
      {caption && <p className="solanum-time-caption">{caption}</p>}
      <ClockReadout text={formatTime(remaining)} reduced={reduced} style={STYLE} />
    </div>
  );
}
