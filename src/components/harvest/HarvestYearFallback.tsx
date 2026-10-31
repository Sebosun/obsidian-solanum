import { useId } from "react";
import { SrLabel } from "@/components/app/SrLabel";
import type { YearMonth } from "@/lib/harvest/year";
import { formatFocus } from "@/lib/time";

interface HarvestYearFallbackProps {
  year: number;
  months: YearMonth[];
  onOpenMonth(index: number): void;
}

/** Plain list of the months, for when the 3D beds cannot render. */
export function HarvestYearFallback({ year, months, onOpenMonth }: HarvestYearFallbackProps) {
  const listId = useId();
  const busiest = Math.max(1, ...months.map((month) => month.minutes));
  return (
    <>
      <SrLabel id={listId}>{`Harvest by month, ${year}`}</SrLabel>
      <ul className="solanum-year-list" aria-labelledby={listId}>
        {months.map((month) => {
          const long = month.date.toLocaleDateString(undefined, { month: "long" });
          return (
            <li key={month.index}>
              <button onClick={() => onOpenMonth(month.index)}>
                <span className="sol:sr-only">{`${long} ${year}, ${Math.round(month.minutes)} focused minutes`}</span>
                <span className="solanum-year-list-month" aria-hidden="true">
                  {long.slice(0, 3)}
                </span>
                <span className="solanum-year-list-track" aria-hidden="true">
                  <span style={{ width: `${(month.minutes / busiest) * 100}%` }} />
                </span>
                <span className="solanum-year-list-value" aria-hidden="true">
                  {month.minutes > 0 ? formatFocus(month.minutes) : "–"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
