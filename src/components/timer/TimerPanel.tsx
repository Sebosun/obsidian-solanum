import { useState } from "react";
import { isActive } from "../../lib/timer/selectors";
import type { Revision } from "../../lib/timer/types";
import type { TimerDraft } from "../../types/timer-ui";
import type { Action, SolanumHost } from "../../types/host";
import { CropScene } from "../crops/CropScene";
import { TimerClock } from "./TimerClock";
import { TimerSetup } from "./TimerSetup";
import { SessionControls } from "./SessionControls";
import { Preferences } from "./Preferences";

export function TimerPanel({
  host,
  sessions,
  conflicted,
  busy,
  act,
}: {
  host: SolanumHost;
  sessions: Revision[];
  conflicted: string[];
  busy: boolean;
  act: Action;
}) {
  const [draft, setDraft] = useState<TimerDraft>({
    minutes: host.settings.defaultMinutes,
    crop: "tomato",
    tags: "",
    note: "",
  });
  const [selected, setSelected] = useState<string | null>(null);
  const active = sessions.filter(isActive);
  const session = active.find((s) => s.sessionId === selected) ?? active[0];
  const remaining = session ? host.timer.remaining(session) : draft.minutes * 60_000;
  const progress = session
    ? session.phase === "focus"
      ? 1 - remaining / session.durationMs
      : 1
    : 0;
  return (
    <>
      {active.length > 1 && (
        <label className="solanum-warning">
          Multiple offline crops are active. Choose one to manage; finish or cancel the others.
          <select
            aria-label="Active crop"
            value={session?.sessionId}
            onChange={(e) => setSelected(e.target.value)}
          >
            {active.map((s) => (
              <option key={s.sessionId} value={s.sessionId}>
                {new Date(s.startedAt).toLocaleString()} · {s.notePath ?? "Unlinked crop"}
              </option>
            ))}
          </select>
        </label>
      )}
      <CropScene
        crop={session?.crop ?? draft.crop}
        progress={Math.max(0, Math.min(1, progress))}
        running={session?.status === "running"}
        assetUrl={host.assetUrl}
      />
      <TimerClock remaining={remaining} session={session} />
      {session ? (
        <SessionControls
          session={session}
          host={host}
          blocked={busy || conflicted.includes(session.sessionId)}
          act={act}
        />
      ) : (
        <TimerSetup
          draft={draft}
          onChange={setDraft}
          host={host}
          sessions={sessions}
          disabled={busy || conflicted.length > 0}
          act={act}
        />
      )}
      <details className="solanum-settings">
        <summary>Timer preferences</summary>
        <Preferences host={host} act={act} busy={busy} />
      </details>
    </>
  );
}
