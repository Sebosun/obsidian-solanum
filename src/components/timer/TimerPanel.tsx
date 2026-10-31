import type { ChangeEvent } from "react";
import { isActive } from "@/lib/timer/selectors";
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
  const selectSession = useAppStore((state) => state.selectSession);
  const revealControls = useAppStore((state) => state.revealControls);
  const active = sessions.filter(isActive);
  let remaining = draft.minutes * 60_000;
  let progress = 0;
  let crop = draft.crop;
  if (session) {
    remaining = services.timer.remaining(session);
    crop = session.crop;
    progress = 1;
    if (session.phase === "focus") progress = 1 - remaining / session.durationMs;
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
      />
      {!immersive && controls}
      {immersive && (
        <button
          className="solanum-reveal-controls"
          aria-label="Show timer controls"
          title="Show controls (Escape)"
          onClick={reveal}
        >
          •••
        </button>
      )}
    </>
  );
}
