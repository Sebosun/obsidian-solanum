import type { ChangeEvent } from "react";

interface HarvestFiltersProps {
  tags: string[];
  notes: string[];
  tag: string;
  notePath: string;
  onTag(tag: string): void;
  onNote(notePath: string): void;
}

export function HarvestFilters({ tags, notes, tag, notePath, onTag, onNote }: HarvestFiltersProps) {
  function changeTag(event: ChangeEvent<HTMLSelectElement>) {
    onTag(event.target.value);
  }
  function changeNote(event: ChangeEvent<HTMLSelectElement>) {
    onNote(event.target.value);
  }
  return (
    <div className="solanum-filters sol:flex sol:gap-2 sol:mb-3">
      <select aria-label="Filter by tag" value={tag} onChange={changeTag}>
        <option value="">All tags</option>
        {tags.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
      <select aria-label="Filter by note" value={notePath} onChange={changeNote}>
        <option value="">All notes</option>
        {notes.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
    </div>
  );
}
