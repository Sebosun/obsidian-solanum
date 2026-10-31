import type { YearMonth } from "@/lib/harvest/year";
import { formatFocus } from "@/lib/time";

interface HarvestYearFallbackProps {
  year: number;
  months: YearMonth[];
  onOpenMonth(index: number): void;
}

/** Plain list of the months, for when the 3D beds cannot render. */
export function HarvestYearFallback({ year, months, onOpenMonth }: HarvestYearFallbackProps) {
  const busiest = Math.max(1, ...months.map((month) => month.minutes));
  return (
    <ul className="solanum-year-list" aria-label={`Harvest by month, ${year}`}>
      {months.map((month) => {
        const long = month.date.toLocaleDateString(undefined, { month: "long" });
        return (
          <li key={month.index}>
            <button
              aria-label={`${long} ${year}, ${Math.round(month.minutes)} focused minutes`}
              onClick={() => onOpenMonth(month.index)}
            >
              <span className="solanum-year-list-month">{long.slice(0, 3)}</span>
              <span className="solanum-year-list-track" aria-hidden="true">
                <span style={{ width: `${(month.minutes / busiest) * 100}%` }} />
              </span>
              <span className="solanum-year-list-value">
                {month.minutes > 0 ? formatFocus(month.minutes) : "–"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
