import type { Revision } from "../../lib/timer/types";
import type { Action, SolanumHost } from "../../types/host";

export function SessionControls({
  session,
  host,
  blocked,
  act,
}: {
  session: Revision;
  host: SolanumHost;
  blocked: boolean;
  act: Action;
}) {
  return (
    <>
      <div className="solanum-session-context sol:flex sol:flex-wrap sol:gap-1.5 sol:items-center sol:justify-center sol:mb-3">
        {session.tags.map((t) => (
          <span className="solanum-tag" key={t}>
            #{t}
          </span>
        ))}
        {session.notePath && (
          <button className="solanum-note-link" onClick={() => host.openNote(session.notePath!)}>
            {session.notePath}
          </button>
        )}
      </div>
      <div className="solanum-actions">
        {session.status === "running" && (
          <button
            className="mod-cta"
            disabled={blocked}
            onClick={() => void act(() => host.timer.pause(session.sessionId))}
          >
            Pause
          </button>
        )}
        {session.status === "paused" && (
          <button
            className="mod-cta"
            disabled={blocked}
            onClick={() => {
              host.unlockAudio();
              void act(() => host.timer.resume(session.sessionId));
            }}
          >
            Resume
          </button>
        )}
        {session.status === "waiting" && (
          <button
            className="mod-cta"
            disabled={blocked}
            onClick={() => {
              host.unlockAudio();
              void act(() => host.timer.startBreak(session.sessionId));
            }}
          >
            Start break
          </button>
        )}
        <button
          disabled={blocked}
          onClick={() => void act(() => host.timer.cancel(session.sessionId))}
        >
          {session.phase === "break" ? "Skip break" : "End focus"}
        </button>
      </div>
    </>
  );
}
