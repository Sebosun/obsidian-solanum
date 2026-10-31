import { useAppStore, useServices } from "@/state/hooks";
import { selectCurrentSession } from "@/state/selectors";
import { ControlIcon, type ControlIconKind } from "@/components/timer/ControlIcon";

export function SessionControls() {
  const services = useServices();
  const session = useAppStore(selectCurrentSession);
  const busy = useAppStore((state) => state.busy);
  const conflicts = useAppStore((state) => state.conflicts);
  const run = useAppStore((state) => state.run);
  if (!session) return null;
  const id = session.sessionId;
  const blocked = busy || conflicts.some((conflict) => conflict.sessionId === id);
  let primaryLabel = "Start break";
  let primaryIcon: ControlIconKind = "play";
  let endLabel = "End focus";
  let endIcon: ControlIconKind = "stop";
  if (session.status === "running") {
    primaryLabel = "Pause";
    primaryIcon = "pause";
  }
  if (session.status === "paused") primaryLabel = "Resume";
  if (session.phase === "break") {
    endLabel = "Skip break";
    endIcon = "skip";
  }

  async function applyPrimaryAction() {
    if (session?.status === "running") await services.timer.pause(id);
    else if (session?.status === "paused") await services.timer.resume(id);
    else await services.timer.startBreak(id);
  }
  function handlePrimary() {
    services.unlockAudio();
    void run(applyPrimaryAction);
  }
  async function endSession() {
    await services.timer.cancel(id);
  }
  function handleEnd() {
    void run(endSession);
  }
  function openNote() {
    if (session?.notePath) services.openNote(session.notePath);
  }

  return (
    <>
      <div className="solanum-session-context sol:flex sol:flex-wrap sol:gap-1.5 sol:items-center sol:justify-center sol:mb-3">
        {session.tags.map((tag) => (
          <span className="solanum-tag" key={tag}>
            {tag}
          </span>
        ))}
        {session.notePath && (
          <button className="solanum-note-link" onClick={openNote}>
            {session.notePath}
          </button>
        )}
      </div>
      <div className="solanum-actions">
        <button
          className="solanum-control"
          aria-label={primaryLabel}
          title={primaryLabel}
          disabled={blocked}
          onClick={handlePrimary}
        >
          <ControlIcon kind={primaryIcon} />
        </button>
        <button
          className="solanum-control"
          aria-label={endLabel}
          title={endLabel}
          disabled={blocked}
          onClick={handleEnd}
        >
          <ControlIcon kind={endIcon} />
        </button>
      </div>
    </>
  );
}
