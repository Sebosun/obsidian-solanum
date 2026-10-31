import type { MouseEvent } from "react";
import type { HarvestDay } from "@/lib/harvest/model";
import { WEEKDAY_INITIALS } from "@/lib/harvest/weekdays";

interface HarvestDayListProps {
  days: HarvestDay[];
  selectedKey: string | null;
  onSelect(key: string): void;
}

/** Plain-DOM month calendar. Only shown when the 3D scene cannot render. */
export function HarvestDayList({ days, selectedKey, onSelect }: HarvestDayListProps) {
  function selectDay(event: MouseEvent<HTMLButtonElement>) {
    const day = event.currentTarget.dataset.day;
    if (day) onSelect(day);
  }
  return (
    <div
      className="solanum-calendar sol:grid sol:grid-cols-7 sol:gap-1"
      aria-label="Monthly harvest day list"
    >
      {WEEKDAY_INITIALS.map((initial, index) => (
        <span className="solanum-weekday" key={index}>
          {initial}
        </span>
      ))}
      {Array.from({ length: days[0].column }, (_, index) => (
        <span key={`empty-${index}`} />
      ))}
      {days.map((day) => (
        <button
          key={day.key}
          aria-label={`${day.key}, ${Math.round(day.minutes)} focused minutes`}
          aria-pressed={selectedKey === day.key}
          className={`solanum-day ${day.items.length ? "has-harvest" : ""}`}
          data-day={day.key}
          onClick={selectDay}
        >
          <span>{day.date.getDate()}</span>
          <small>{Math.round(day.minutes)}m</small>
        </button>
      ))}
    </div>
  );
}
