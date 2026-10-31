import type { ChangeEvent } from "react";
import { isActive } from "@/lib/timer/selectors";
import { resolveSeason } from "@/lib/scene/seasons";
import { useAppStore, useServices } from "@/state/hooks";
import { selectCurrentSession } from "@/state/selectors";
import { CropScene } from "@/components/crops/CropScene";
import { TimerSetup } from "@/components/timer/TimerSetup";
import { SessionControls } from "@/components/timer/SessionControls";

interface TimerPanelProps {
  immersive: boolean;
}

export function TimerPanel({ immersive }: TimerPanelProps) {
  const services = useServices();
  const sessions = useAppStore((state) => state.sessions);
  const draft = useAppStore((state) => state.draft);
  const session = useAppStore(selectCurrentSession);
  const seasonChoice = useAppStore((state) => state.season);
  const selectSession = useAppStore((state) => state.selectSession);
  const revealControls = useAppStore((state) => state.revealControls);
  const active = sessions.filter(isActive);
  let remaining = draft.minutes * 60_000;
  let progress = 0;
  let crop = draft.crop;
  let clockProgress = 0;
  let clockRate = 0;
  if (session) {
    remaining = services.timer.remaining(session);
    crop = session.crop;
    progress = 1;
    if (session.phase === "focus") progress = 1 - remaining / session.durationMs;
    // The sun crosses the sky once per phase: the focus, then the break once it has started.
    if (session.phase === "focus") clockProgress = progress;
    else if (session.phase === "break" && session.status !== "waiting")
      clockProgress = 1 - remaining / session.breakMs;
    const phaseMs = session.phase === "focus" ? session.durationMs : session.breakMs;
    if (session.status === "running" && session.phase !== "done") clockRate = 1000 / phaseMs;
  }
  function changeSession(event: ChangeEvent<HTMLSelectElement>) {
    selectSession(event.target.value);
  }
  function reveal() {
    if (session) revealControls(session.id);
  }
  let controls = <TimerSetup />;
  if (session) controls = <SessionControls />;

  return (
    <>
      {active.length > 1 && (
        <label className="solanum-warning">
          Multiple active crops
          <select aria-label="Active crop" value={session?.sessionId} onChange={changeSession}>
            {active.map((item) => (
              <option key={item.sessionId} value={item.sessionId}>
                {new Date(item.startedAt).toLocaleString()} · {item.notePath ?? "Unlinked crop"}
              </option>
            ))}
          </select>
        </label>
      )}
      <CropScene
        crop={crop}
        progress={Math.max(0, Math.min(1, progress))}
        running={session?.status === "running"}
        remaining={remaining}
        immersive={immersive}
        clockProgress={Math.max(0, Math.min(1, clockProgress))}
        clockRate={clockRate}
        season={resolveSeason(seasonChoice, new Date())}
      />
      {!immersive && controls}
      {immersive && (
        <button
          className="solanum-reveal-controls"
          aria-label="Show timer controls"
          title="Show controls (Escape)"
          onClick={reveal}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </>
  );
}
