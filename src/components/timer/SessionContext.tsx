import { useAppStore, useServices } from "@/state/hooks";
import { selectCurrentSession } from "@/state/selectors";

/** The tags and the linked note of the current session, for when the timer does not fill the view. */
export function SessionContext() {
  const services = useServices();
  const session = useAppStore(selectCurrentSession);
  if (!session) return null;
  function openNote() {
    if (session?.notePath) services.openNote(session.notePath);
  }

  return (
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
  );
}
