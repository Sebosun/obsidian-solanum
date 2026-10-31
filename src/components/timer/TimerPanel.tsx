import { useEffect, type ChangeEvent } from "react";
import { isActive } from "@/lib/timer/selectors";
import { timerDisplay } from "@/lib/timer/display";
import { resolveSeason } from "@/lib/scene/seasons";
import { BREAK_SCENE } from "@/lib/scene/constants";
import { useAppStore, useServices } from "@/state/hooks";
import { selectCurrentSession } from "@/state/selectors";
import { TimerScene } from "@/components/scenes/TimerScene";
import { TimerSetup } from "@/components/timer/TimerSetup";
import { SessionActions } from "@/components/timer/SessionActions";
import { SessionContext } from "@/components/timer/SessionContext";
import { useCropAssets } from "@/hooks/useCropAssets";

interface TimerPanelProps {
  immersive: boolean;
}

export function TimerPanel({ immersive }: TimerPanelProps) {
  const services = useServices();
  const assets = useCropAssets();
  const sessions = useAppStore((state) => state.sessions);
  const draft = useAppStore((state) => state.draft);
  const session = useAppStore(selectCurrentSession);
  const seasonChoice = useAppStore((state) => state.season);
  const selectSession = useAppStore((state) => state.selectSession);
  const active = sessions.filter(isActive);
  const display = timerDisplay(session, session ? services.timer.remaining(session) : 0, draft);
  const hasSession = !!session;
  useEffect(() => {
    // Have the cat and the mug ready before the break starts, so they are there the moment they
    // are wanted.
    if (!hasSession) return;
    for (const model of [BREAK_SCENE.catModel, BREAK_SCENE.mug.model])
      void assets.loadModel(model).catch(() => {});
  }, [hasSession, assets]);
  function changeSession(event: ChangeEvent<HTMLSelectElement>) {
    selectSession(event.target.value);
  }
  let below = <TimerSetup />;
  if (session) below = <SessionContext />;

  return (
    <>
      {active.length > 1 && (
        <label className="solanum-warning">
          Multiple active crops
          <select value={session?.sessionId} onChange={changeSession}>
            {active.map((item) => (
              <option key={item.sessionId} value={item.sessionId}>
                {new Date(item.startedAt).toLocaleString()} · {item.notePath ?? "Unlinked crop"}
              </option>
            ))}
          </select>
        </label>
      )}
      <TimerScene
        {...display}
        running={session?.status === "running"}
        immersive={immersive}
        controls={session && <SessionActions />}
        preview={!session}
        season={resolveSeason(seasonChoice, new Date())}
      />
      {!immersive && below}
    </>
  );
}
