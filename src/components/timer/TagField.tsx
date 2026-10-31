import { useId, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { normalizeTags } from "@/lib/timer/selectors";
import { cleanTag, nextIndex, tagSuggestions } from "@/lib/timer/suggestions";
import { useAppStore, useServices } from "@/state/hooks";
import { SuggestionList, suggestionId } from "@/components/ui/SuggestionList";

export function TagField() {
  const host = useServices();
  const chosen = useAppStore((state) => state.draft.tags);
  const sessions = useAppStore((state) => state.sessions);
  const updateDraft = useAppStore((state) => state.updateDraft);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const inputId = useId();
  const known = [...new Set([...host.tags(), ...sessions.flatMap((session) => session.tags)])];
  const activeNote = host.activeNote();
  // Only what the note has that is not already chosen is worth offering.
  const fromNote = activeNote
    ? normalizeTags(host.noteTags(activeNote)).filter((tag) => !chosen.includes(tag))
    : [];
  const available = tagSuggestions(known, chosen, query);
  const items = open ? available : [];

  function addTags(tags: string[]) {
    updateDraft({ tags: normalizeTags([...chosen, ...tags]) });
  }
  function addFromNote() {
    addTags(fromNote);
  }
  function commitQuery() {
    if (cleanTag(query)) addTags([query]);
    setQuery("");
    setActive(-1);
    setOpen(false);
  }
  function changeQuery(event: ChangeEvent<HTMLInputElement>) {
    const parts = event.target.value.split(/[\s,]+/);
    const finished = parts.slice(0, -1).filter((part) => cleanTag(part));
    if (finished.length > 0) addTags(finished);
    setQuery(parts[parts.length - 1]);
    setActive(-1);
    setOpen(true);
  }
  function pick(tag: string) {
    addTags([tag]);
    setQuery("");
    setActive(-1);
    setOpen(false);
  }
  function removeTag(tag: string) {
    updateDraft({ tags: chosen.filter((item) => item !== tag) });
  }
  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive(nextIndex(active, event.key === "ArrowDown" ? 1 : -1, available.length));
    } else if (event.key === "Enter" || event.key === "Tab") {
      if (event.key === "Tab" && !cleanTag(query) && active < 0) return;
      event.preventDefault();
      if (open && active >= 0 && items[active]) pick(items[active].value);
      else commitQuery();
    } else if (event.key === "Backspace" && query === "" && chosen.length > 0) {
      removeTag(chosen[chosen.length - 1]);
    } else if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
    }
  }
  function handleBlur() {
    commitQuery();
    setOpen(false);
  }
  function openList() {
    setOpen(true);
  }

  return (
    <div className="solanum-field solanum-combo">
      <div className="solanum-field-header">
        <label htmlFor={inputId}>Tags</label>
        {fromNote.length > 0 && (
          <button type="button" className="solanum-subtle" onClick={addFromNote}>
            Add active note's tags
          </button>
        )}
      </div>
      <div className="solanum-chip-input">
        {chosen.map((tag) => (
          <span className="solanum-chip" key={tag}>
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => removeTag(tag)}>
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true">
                <path d="M2 2l6 6M8 2 2 8" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </span>
        ))}
        <input
          id={inputId}
          role="combobox"
          aria-label="Tags"
          aria-expanded={items.length > 0}
          aria-controls={listId}
          aria-activedescendant={suggestionId(listId, active)}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder={chosen.length === 0 ? "Add tags" : ""}
          onChange={changeQuery}
          onKeyDown={handleKey}
          onFocus={openList}
          onClick={openList}
          onBlur={handleBlur}
        />
      </div>
      {items.length > 0 && (
        <SuggestionList id={listId} items={items} activeIndex={active} onPick={pick} />
      )}
    </div>
  );
}
