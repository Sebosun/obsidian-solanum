import { formatTime } from "../../lib/time";

export function TimerClock({ remaining }: { remaining: number }) {
  return (
    <div role="timer" aria-label="Remaining time" className="solanum-countdown">
      {formatTime(remaining)}
    </div>
  );
}
