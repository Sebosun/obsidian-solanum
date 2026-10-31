import { useId, type ChangeEvent } from "react";
import { useAppStore, useServices } from "../../state/hooks";

export function SessionDetailsForm() {
  const host = useServices();
  const draft = useAppStore((state) => state.draft);
  const sessions = useAppStore((state) => state.sessions);
  const updateDraft = useAppStore((state) => state.updateDraft);
  const tagsId = useId();
  const notesId = useId();
  const tags = [
    ...new Set([...host.tags(), ...sessions.flatMap((session) => session.tags)]),
  ].sort();
  function changeTags(event: ChangeEvent<HTMLInputElement>) {
    updateDraft({ tags: event.target.value });
  }
  function changeNote(event: ChangeEvent<HTMLInputElement>) {
    updateDraft({ note: event.target.value });
  }
  function useActiveNote() {
    updateDraft({ note: host.activeNote() ?? "" });
  }
  return (
    <details className="solanum-session-details">
      <summary>Details</summary>
      <label className="solanum-field">
        Tags
        <input list={tagsId} value={draft.tags} onChange={changeTags} />
      </label>
      <datalist id={tagsId}>
        {tags.map((tag) => (
          <option key={tag} value={`#${tag}`} />
        ))}
      </datalist>
      <label className="solanum-field">
        Linked note
        <input list={notesId} value={draft.note} onChange={changeNote} />
      </label>
      <datalist id={notesId}>
        {host.notes().map((path) => (
          <option key={path} value={path} />
        ))}
      </datalist>
      <button className="solanum-subtle" onClick={useActiveNote}>
        Use active note
      </button>
    </details>
  );
}
