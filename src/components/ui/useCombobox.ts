import { useId, useState, type KeyboardEvent } from "react";
import { nextIndex } from "@/lib/timer/suggestions";
import { suggestionId, type Suggestion } from "@/components/ui/SuggestionList";

/**
 * What a field with a dropdown of suggestions shares: the text typed, whether the list is open, the
 * highlighted row, and the attributes that tell assistive technology about all three. `suggest`
 * lists the rows for the text typed so far. The field decides what picking, Enter and typing do.
 */
export function useCombobox(suggest: (query: string) => Suggestion[]) {
  const listId = useId();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const available = suggest(query);
  const items = open ? available : [];

  function openList() {
    setOpen(true);
  }
  function closeList() {
    setOpen(false);
  }
  /** Takes new text and opens the list on it, with no row highlighted. */
  function type(text: string) {
    setQuery(text);
    setActive(-1);
    setOpen(true);
  }
  /** Empties the field and closes the list, once something has been picked or committed. */
  function reset() {
    setQuery("");
    setActive(-1);
    setOpen(false);
  }
  /** Arrow keys move the highlight and Escape closes the list; reports whether it took the key. */
  function handleListKey(event: KeyboardEvent<HTMLInputElement>): boolean {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive(nextIndex(active, event.key === "ArrowDown" ? 1 : -1, available.length));
      return true;
    }
    if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      return true;
    }
    return false;
  }

  const inputProps = {
    id: inputId,
    role: "combobox",
    "aria-expanded": items.length > 0,
    "aria-controls": listId,
    "aria-activedescendant": suggestionId(listId, active),
    "aria-autocomplete": "list",
    autoComplete: "off",
    value: query,
    onFocus: openList,
    onClick: openList,
  } as const;

  return {
    query,
    open,
    active,
    items,
    listId,
    inputId,
    inputProps,
    type,
    reset,
    closeList,
    handleListKey,
  };
}
