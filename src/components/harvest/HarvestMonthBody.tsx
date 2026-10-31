import type { HarvestBlocks, MonthSummary } from "@/lib/harvest/month";
import { isEmptyMonth } from "@/lib/harvest/empty";
import type { SeasonId } from "@/lib/scene/seasons";
import { HarvestCaption } from "@/components/harvest/HarvestCaption";
import { HarvestMonthSummary } from "@/components/harvest/HarvestMonthSummary";
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

/** The month's blocks, with its summary beneath, or a caption when nothing was harvested. */
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
      <HarvestMonthScene layout={layout} season={season} />
      {/* An empty month still shows its plinth, with nothing on it, rather than giving way to a message. */}
      {isEmptyMonth(layout) ? (
        caption
      ) : (
        <HarvestMonthSummary summary={summary} shown={layout.blocks.length} total={layout.total} />
      )}
    </>
  );
}
