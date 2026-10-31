import type { YearMonth } from "@/lib/harvest/year";
import { seasonOf } from "@/lib/scene/seasons";

interface HarvestYearMonthProps {
  month: YearMonth;
  onOpen(index: number): void;
}

export function HarvestYearMonth({ month, onOpen }: HarvestYearMonthProps) {
  const long = month.date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const short = month.date.toLocaleDateString(undefined, { month: "short" });
  const minutes = Math.round(month.minutes);
  function open() {
    onOpen(month.index);
  }
  return (
    <button
      className="solanum-year-month"
      data-season={seasonOf(month.date)}
      aria-label={`${long}, ${minutes} focused minutes`}
      onClick={open}
    >
      <span className="solanum-year-month-head">
        <span>{short}</span>
        {minutes > 0 && <small>{minutes}m</small>}
      </span>
      <span className="solanum-year-days" aria-hidden="true">
        {month.days.map((day, index) => (
          <span
            key={day.key}
            className={`solanum-year-day level-${day.level}`}
            style={index === 0 ? { gridColumnStart: month.offset + 1 } : undefined}
            title={day.minutes > 0 ? `${day.key} · ${Math.round(day.minutes)} min` : day.key}
          />
        ))}
      </span>
    </button>
  );
}
