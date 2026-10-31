import { useId, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { nextIndex, noteFolder, noteName, noteSuggestions } from "@/lib/timer/suggestions";
import { useAppStore, useServices } from "@/state/hooks";
import { SuggestionList, suggestionId } from "@/components/ui/SuggestionList";

export function NoteField() {
  const host = useServices();
  const note = useAppStore((state) => state.draft.note);
  const updateDraft = useAppStore((state) => state.updateDraft);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputId = useId();
  const available = noteSuggestions(host.notes(), query);
  const items = open ? available : [];
  const activeNote = host.activeNote();

  function choose(path: string) {
    updateDraft({ note: path });
    setQuery("");
    setActive(-1);
    setOpen(false);
  }
  function clear() {
    updateDraft({ note: "" });
  }
  function useActiveNote() {
    if (activeNote) choose(activeNote);
  }
  function changeQuery(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setActive(-1);
    setOpen(true);
  }
  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive(nextIndex(active, event.key === "ArrowDown" ? 1 : -1, available.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = items[active] ?? (query.trim() ? items[0] : undefined);
      if (target) choose(target.value);
    } else if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
    }
  }
  function openList() {
    setOpen(true);
  }
  function closeList() {
    setOpen(false);
  }

  if (note) {
    const folder = noteFolder(note);
    return (
      <div className="solanum-field">
        <span>Linked note</span>
        <div className="solanum-note-chip">
          <span className="solanum-note-chip-name">{noteName(note)}</span>
          {folder && <small>{folder}</small>}
          <button type="button" aria-label="Clear linked note" onClick={clear}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <path d="M2 2l6 6M8 2 2 8" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="solanum-field solanum-combo">
      <div className="solanum-field-header">
        <label htmlFor={inputId}>Linked note</label>
        {activeNote && (
          <button type="button" className="solanum-subtle" onClick={useActiveNote}>
            Use active note
          </button>
        )}
      </div>
      <input
        id={inputId}
        role="combobox"
        aria-label="Linked note"
        aria-expanded={items.length > 0}
        aria-controls={listId}
        aria-activedescendant={suggestionId(listId, active)}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder="Search notes"
        onChange={changeQuery}
        onKeyDown={handleKey}
        onFocus={openList}
        onClick={openList}
        onBlur={closeList}
      />
      {items.length > 0 && (
        <SuggestionList id={listId} items={items} activeIndex={active} onPick={choose} />
      )}
    </div>
  );
}
