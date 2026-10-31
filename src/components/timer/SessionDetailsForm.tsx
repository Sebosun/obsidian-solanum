import { useId, type ChangeEvent } from "react";
import type { Revision } from "../../lib/timer/types";
import type { TimerDraft } from "../../types/timer-ui";
import type { SolanumHost } from "../../types/host";

export function SessionDetailsForm({
  draft,
  onChange,
  host,
  sessions,
}: {
  draft: TimerDraft;
  onChange: (draft: TimerDraft) => void;
  host: SolanumHost;
  sessions: Revision[];
}) {
  const tagsId = useId();
  const notesId = useId();
  const tags = [
    ...new Set([...host.tags(), ...sessions.flatMap((session) => session.tags)]),
  ].sort();
  function changeTags(event: ChangeEvent<HTMLInputElement>) {
    onChange({ ...draft, tags: event.target.value });
  }
  function changeNote(event: ChangeEvent<HTMLInputElement>) {
    onChange({ ...draft, note: event.target.value });
  }
  function useActiveNote() {
    onChange({ ...draft, note: host.activeNote() ?? "" });
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
