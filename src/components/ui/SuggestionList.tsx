import { useEffect, useRef, type MouseEvent } from "react";
import type { Suggestion } from "@/lib/timer/suggestions";

export type { Suggestion };

interface SuggestionListProps {
  id: string;
  items: Suggestion[];
  /** Index highlighted by the keyboard, or -1 for none. */
  activeIndex: number;
  onPick(value: string): void;
}

/** Obsidian-style dropdown. Picks on mouse-down so the input keeps focus. */
export function SuggestionList({ id, items, activeIndex, onPick }: SuggestionListProps) {
  const list = useRef<HTMLUListElement>(null);
  // With a long list the highlighted row can be out of sight: keep it in view as it moves.
  useEffect(() => {
    const row = list.current?.children[activeIndex];
    if (row && typeof row.scrollIntoView === "function") row.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);
  function pick(event: MouseEvent<HTMLLIElement>) {
    event.preventDefault();
    const value = event.currentTarget.dataset.value;
    if (value !== undefined) onPick(value);
  }
  return (
    <ul ref={list} role="listbox" id={id} className="solanum-suggest">
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
