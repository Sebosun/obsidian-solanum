import type { ChangeEvent, KeyboardEvent, MouseEvent } from "react";
import { normalizeTags } from "@/lib/timer/selectors";
import { knownTags, tagsToAdd } from "@/lib/timer/knownTags";
import { cleanTag, tagSuggestions } from "@/lib/timer/suggestions";
import { useAppStore, useServices } from "@/state/hooks";
import { CloseIcon } from "@/components/ui/CloseIcon";
import { SuggestionList } from "@/components/ui/SuggestionList";
import { useCombobox } from "@/components/ui/useCombobox";

export function TagField() {
  const host = useServices();
  const chosen = useAppStore((state) => state.draft.tags);
  const sessions = useAppStore((state) => state.sessions);
  const updateDraft = useAppStore((state) => state.updateDraft);
  const known = knownTags(host.tags(), sessions);
  const activeNote = host.activeNote();
  // Only what the note has that is not already chosen is worth offering.
  const fromNote = activeNote ? tagsToAdd(host.noteTags(activeNote), chosen) : [];

  function suggest(query: string) {
    return tagSuggestions(known, chosen, query);
  }
  const combo = useCombobox(suggest);

  function addTags(tags: string[]) {
    updateDraft({ tags: normalizeTags([...chosen, ...tags]) });
  }
  function addFromNote() {
    addTags(fromNote);
  }
  function commitQuery() {
    if (cleanTag(combo.query)) addTags([combo.query]);
    combo.reset();
  }
  function changeQuery(event: ChangeEvent<HTMLInputElement>) {
    const parts = event.target.value.split(/[\s,]+/);
    const finished = parts.slice(0, -1).filter((part) => cleanTag(part));
    if (finished.length > 0) addTags(finished);
    combo.type(parts[parts.length - 1]);
  }
  function pick(tag: string) {
    addTags([tag]);
    combo.reset();
  }
  function removeTag(tag: string) {
    updateDraft({ tags: chosen.filter((item) => item !== tag) });
  }
  function removeClickedTag(event: MouseEvent<HTMLButtonElement>) {
    const tag = event.currentTarget.dataset.tag;
    if (tag !== undefined) removeTag(tag);
  }
  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (combo.handleListKey(event)) return;
    if (event.key === "Enter" || event.key === "Tab") {
      if (event.key === "Tab" && !cleanTag(combo.query) && combo.active < 0) return;
      event.preventDefault();
      const target = combo.items[combo.active];
      if (combo.open && combo.active >= 0 && target) pick(target.value);
      else commitQuery();
    } else if (event.key === "Backspace" && combo.query === "" && chosen.length > 0) {
      removeTag(chosen[chosen.length - 1]);
    }
  }
  function handleBlur() {
    commitQuery();
  }

  return (
    <div className="solanum-field solanum-combo">
      <div className="solanum-field-header">
        <label htmlFor={combo.inputId}>Tags</label>
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
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              data-tag={tag}
              onClick={removeClickedTag}
            >
              <CloseIcon size={8} />
            </button>
          </span>
        ))}
        <input
          {...combo.inputProps}
          placeholder={chosen.length === 0 ? "Add tags" : ""}
          onChange={changeQuery}
          onKeyDown={handleKey}
          onBlur={handleBlur}
        />
      </div>
      {combo.items.length > 0 && (
        <SuggestionList
          id={combo.listId}
          items={combo.items}
          activeIndex={combo.active}
          onPick={pick}
        />
      )}
    </div>
  );
}
