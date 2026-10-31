import type { ChangeEvent, KeyboardEvent } from "react";
import { noteFolder, noteName, noteSuggestions } from "@/lib/timer/suggestions";
import { useAppStore, useServices } from "@/state/hooks";
import { CloseIcon } from "@/components/ui/CloseIcon";
import { SuggestionList } from "@/components/ui/SuggestionList";
import { useCombobox } from "@/components/ui/useCombobox";

export function NoteField() {
  const host = useServices();
  const note = useAppStore((state) => state.draft.note);
  const updateDraft = useAppStore((state) => state.updateDraft);
  const activeNote = host.activeNote();

  function suggest(query: string) {
    return noteSuggestions(host.notes(), query);
  }
  const combo = useCombobox(suggest);

  function choose(path: string) {
    updateDraft({ note: path });
    combo.reset();
  }
  function clear() {
    updateDraft({ note: "" });
  }
  function addActiveNote() {
    if (activeNote) choose(activeNote);
  }
  function changeQuery(event: ChangeEvent<HTMLInputElement>) {
    combo.type(event.target.value);
  }
  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (combo.handleListKey(event)) return;
    if (event.key !== "Enter") return;
    event.preventDefault();
    const target = combo.items[combo.active] ?? (combo.query.trim() ? combo.items[0] : undefined);
    if (target) choose(target.value);
  }

  if (note) {
    const folder = noteFolder(note);
    return (
      <div className="solanum-field">
        <span>Linked note</span>
        <div className="solanum-chip-input">
          <span className="solanum-chip solanum-note-chip">
            <span className="solanum-note-chip-name">{noteName(note)}</span>
            {folder && <small>{folder}</small>}
            <button type="button" aria-label="Clear linked note" onClick={clear}>
              <CloseIcon size={8} />
            </button>
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className="solanum-field solanum-combo">
      <div className="solanum-field-header">
        <label htmlFor={combo.inputId}>Linked note</label>
        {activeNote && (
          <button type="button" className="solanum-subtle" onClick={addActiveNote}>
            Use active note
          </button>
        )}
      </div>
      <div className="solanum-chip-input">
        <input
          {...combo.inputProps}
          placeholder="Search notes"
          onChange={changeQuery}
          onKeyDown={handleKey}
          onBlur={combo.closeList}
        />
      </div>
      {combo.items.length > 0 && (
        <SuggestionList
          id={combo.listId}
          items={combo.items}
          activeIndex={combo.active}
          onPick={choose}
        />
      )}
    </div>
  );
}
