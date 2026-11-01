import type { FocusBreakdown } from "@/lib/harvest/insights";
import { HarvestFocusBreakdown } from "@/components/harvest/HarvestFocusBreakdown";
import { FocusActivityChart } from "@/components/harvest/FocusActivityChart";
import { HarvestComparison } from "@/components/harvest/HarvestComparison";
import type { YearMonth, YearStacks } from "@/lib/harvest/year";
import { HarvestCaption, type HarvestCaptionAction } from "@/components/harvest/HarvestCaption";
import { HarvestYearScene } from "@/components/scenes/HarvestYearScene";
import { HarvestSummary } from "@/components/harvest/HarvestSummary";
import type { MonthSummary } from "@/lib/harvest/month";

interface HarvestYearBodyProps {
  year: number;
  months: YearMonth[];
  summary: MonthSummary;
  previous: MonthSummary;
  insights: FocusBreakdown;
  layout: YearStacks;
  /** A tag or note filter is narrowing what shows. */
  filtered: boolean;
  onClearFilters(): void;
  onOpenMonth(index: number): void;
}

/** The year's crates and summary, or a recovery action when there are none. */
export function HarvestYearBody({
  year,
  months,
  summary,
  previous,
  insights,
  layout,
  filtered,
  onClearFilters,
  onOpenMonth,
}: HarvestYearBodyProps) {
  // An empty year still shows its twelve crates, just empty ones.
  let caption = `No harvests in ${year} yet.`;
  let action: HarvestCaptionAction | undefined;
  if (filtered) {
    caption = "No matching harvests this year.";
    action = { label: "Clear filters", run: onClearFilters };
  }
  return (
    <>
      <HarvestYearScene year={year} months={months} layout={layout} onOpenMonth={onOpenMonth} />
      {summary.harvests > 0 ? (
        <HarvestSummary summary={summary} period="year">
          <div className="solanum-period-insights">
            <FocusActivityChart
              entries={months.map(({ date, minutes }) => ({ date, minutes }))}
              period="year"
            />
            <HarvestFocusBreakdown insights={insights} minutes={summary.minutes} />
            <HarvestComparison
              date={new Date(year, 0, 1)}
              period="year"
              current={summary}
              previous={previous}
            />
          </div>
        </HarvestSummary>
      ) : (
        <HarvestCaption text={caption} action={action} />
      )}
    </>
  );
}
