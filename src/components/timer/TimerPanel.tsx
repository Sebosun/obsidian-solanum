import type { ChangeEvent } from "react";
import { isActive } from "../../lib/timer/selectors";
import { useAppStore, useServices } from "../../state/hooks";
import { selectCurrentSession } from "../../state/selectors";
import { CropScene } from "../crops/CropScene";
import { TimerSetup } from "./TimerSetup";
import { SessionControls } from "./SessionControls";

export function TimerPanel() {
  const services = useServices();
  const sessions = useAppStore((state) => state.sessions);
  const draft = useAppStore((state) => state.draft);
  const session = useAppStore(selectCurrentSession);
  const selectSession = useAppStore((state) => state.selectSession);
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
      />
      {controls}
    </>
  );
}
