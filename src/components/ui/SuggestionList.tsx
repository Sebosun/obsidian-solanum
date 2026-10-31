import type { MouseEvent } from "react";

export interface Suggestion {
  value: string;
  label: string;
  /** Muted secondary text, such as a note's folder. */
  detail?: string;
}

interface SuggestionListProps {
  id: string;
  items: Suggestion[];
  /** Index highlighted by the keyboard, or -1 for none. */
  activeIndex: number;
  onPick(value: string): void;
}

/** Obsidian-style dropdown. Picks on mouse-down so the input keeps focus. */
export function SuggestionList({ id, items, activeIndex, onPick }: SuggestionListProps) {
  function pick(event: MouseEvent<HTMLLIElement>) {
    event.preventDefault();
    const value = event.currentTarget.dataset.value;
    if (value !== undefined) onPick(value);
  }
  return (
    <ul role="listbox" id={id} className="solanum-suggest">
      {items.map((item, index) => (
        <li
          key={item.value}
          id={suggestionId(id, index)}
          role="option"
          aria-selected={index === activeIndex}
          className="solanum-suggest-item"
          data-value={item.value}
          onMouseDown={pick}
        >
          <span className="solanum-suggest-label">{item.label}</span>
          {item.detail && <span className="solanum-suggest-detail">{item.detail}</span>}
        </li>
      ))}
    </ul>
  );
}

export function suggestionId(listId: string, index: number): string | undefined {
  return index < 0 ? undefined : `${listId}-${index}`;
}
