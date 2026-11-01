import type { HarvestBlocks, MonthSummary } from "@/lib/harvest/month";
import { isEmptyMonth } from "@/lib/harvest/empty";
import type { SeasonId } from "@/lib/scene/seasons";
import { HarvestCaption } from "@/components/harvest/HarvestCaption";
import { HarvestSummary } from "@/components/harvest/HarvestSummary";
import { HarvestMonthScene } from "@/components/scenes/HarvestMonthScene";

interface HarvestMonthBodyProps {
  month: Date;
  layout: HarvestBlocks;
  summary: MonthSummary;
  season: SeasonId;
  /** A tag or note filter is narrowing what shows. */
  filtered: boolean;
  onClearFilters(): void;
  onStartFocus(): void;
}

/** The month's summary and blocks, or a caption when nothing was harvested. */
export function HarvestMonthBody({
  month,
  layout,
  summary,
  season,
  filtered,
  onClearFilters,
  onStartFocus,
}: HarvestMonthBodyProps) {
  const clearAction = { label: "Clear filters", run: onClearFilters };
  const startAction = { label: "Start focus", run: onStartFocus };
  const monthName = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  let caption = <HarvestCaption text={`No harvests in ${monthName} yet.`} action={startAction} />;
  if (filtered)
    caption = <HarvestCaption text="No matching harvests this month." action={clearAction} />;
  return (
    <>
      {!isEmptyMonth(layout) && <HarvestSummary summary={summary} period="month" />}
      <HarvestMonthScene layout={layout} season={season} />
      {/* An empty month still shows its plinth, with nothing on it, rather than giving way to a message. */}
      {isEmptyMonth(layout) ? (
        caption
      ) : (
        <p className="solanum-hint">
          One block per harvest; longer sessions are taller.
          {layout.blocks.length < layout.total &&
            ` Showing ${layout.blocks.length} of ${layout.total}, spread evenly across the month.`}
        </p>
      )}
    </>
  );
}
