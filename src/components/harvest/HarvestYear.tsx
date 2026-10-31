import type { YearMonth } from "@/lib/harvest/year";
import { HarvestYearMonth } from "@/components/harvest/HarvestYearMonth";

interface HarvestYearProps {
  months: YearMonth[];
  onOpenMonth(index: number): void;
}

const LEGEND_LEVELS = [0, 1, 2, 3, 4] as const;

export function HarvestYear({ months, onOpenMonth }: HarvestYearProps) {
  return (
    <div className="solanum-year">
      <div className="solanum-year-grid">
        {months.map((month) => (
          <HarvestYearMonth key={month.index} month={month} onOpen={onOpenMonth} />
        ))}
      </div>
      <div className="solanum-year-legend" aria-hidden="true">
        <span>Less</span>
        {LEGEND_LEVELS.map((level) => (
          <span key={level} className={`solanum-year-day level-${level}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
