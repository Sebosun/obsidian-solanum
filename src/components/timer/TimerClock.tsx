import type { Revision } from "../../lib/timer/types";
import { formatTime } from "../../lib/time";

export function TimerClock({ remaining, session }: { remaining: number; session?: Revision }) {
  const label = session
    ? session.phase === "break"
      ? "REST & REPLENISH"
      : session.status === "paused"
        ? "GROWTH PAUSED"
        : "TIME TO GROW"
    : "READY WHEN YOU ARE";
  return (
    <section className="solanum-clock sol:text-center sol:pt-[23px] sol:pb-3.5">
      <span className="solanum-eyebrow">{label}</span>
      <div
        role="timer"
        aria-label="Remaining time"
        className="solanum-countdown sol:text-[clamp(40px,15cqi,64px)] sol:font-light sol:leading-[1.2] sol:tracking-[-3px] sol:tabular-nums sol:mt-2"
      >
        {formatTime(remaining)}
      </div>
      <p>
        {session?.phase === "break"
          ? "Your crop is grown. Give yourself a little rest."
          : "One task. A little space. Something good grows."}
      </p>
    </section>
  );
}
