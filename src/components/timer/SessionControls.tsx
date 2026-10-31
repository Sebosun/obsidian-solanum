import { useAppStore, useServices } from "@/state/hooks";
import { selectCurrentSession } from "@/state/selectors";

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
  let endLabel = "End focus";
  if (session.status === "running") primaryLabel = "Pause";
  if (session.status === "paused") primaryLabel = "Resume";
  if (session.phase === "break") endLabel = "Skip break";

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
        <button className="mod-cta" disabled={blocked} onClick={handlePrimary}>
          {primaryLabel}
        </button>
        <button disabled={blocked} onClick={handleEnd}>
          {endLabel}
        </button>
      </div>
    </>
  );
}
