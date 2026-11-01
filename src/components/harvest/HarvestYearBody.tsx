import type { YearMonth, YearStacks } from "@/lib/harvest/year";
import { formatFocus } from "@/lib/time";
import { HarvestCaption, type HarvestCaptionAction } from "@/components/harvest/HarvestCaption";
import { HarvestYearScene } from "@/components/scenes/HarvestYearScene";
import { HarvestSummary } from "@/components/harvest/HarvestSummary";
import type { MonthSummary } from "@/lib/harvest/month";

interface HarvestYearBodyProps {
  year: number;
  months: YearMonth[];
  summary: MonthSummary;
  layout: YearStacks;
  /** A tag or note filter is narrowing what shows. */
  filtered: boolean;
  onClearFilters(): void;
  onOpenMonth(index: number): void;
}

/** The year's crates, with a caption on what a crate means, or on why there are none. */
export function HarvestYearBody({
  year,
  months,
  summary,
  layout,
  filtered,
  onClearFilters,
  onOpenMonth,
}: HarvestYearBodyProps) {
  // An empty year still shows its twelve crates, just empty ones.
  const busiest = layout.stacks.find((stack) => stack.busiest);
  let caption = `Each crate stands for ${formatFocus(layout.crateMinutes)} of focus.`;
  let action: HarvestCaptionAction | undefined;
  if (busiest) {
    const name = months[busiest.index].date.toLocaleDateString(undefined, { month: "long" });
    caption += ` Busiest: ${name}, ${formatFocus(busiest.minutes)}.`;
  } else if (filtered) {
    caption = "No matching harvests this year.";
    action = { label: "Clear filters", run: onClearFilters };
  } else {
    caption = `No harvests in ${year} yet.`;
  }
  return (
    <>
      {summary.harvests > 0 && <HarvestSummary summary={summary} period="year" />}
      <HarvestYearScene year={year} months={months} layout={layout} onOpenMonth={onOpenMonth} />
      <HarvestCaption text={caption} action={action} />
    </>
  );
}
