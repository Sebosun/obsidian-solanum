import { useId, useState, type KeyboardEvent } from "react";
import type { HarvestBlocks, MonthSummary } from "@/lib/harvest/month";
import { isEmptyMonth } from "@/lib/harvest/empty";
import type { SeasonId } from "@/lib/scene/seasons";
import { HarvestDetail } from "@/components/harvest/HarvestDetail";
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
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const detailId = useId();
  const inspectedIndex = layout.blocks.findIndex((block) => block.sessionId === inspectedId);
  const inspected = layout.blocks[inspectedIndex];
  function clearInspection() {
    setInspectedId(null);
  }
  function browse(direction: number) {
    const count = layout.blocks.length;
    if (count === 0) return;
    let next = inspectedIndex + direction;
    if (inspectedIndex < 0) next = direction > 0 ? 0 : count - 1;
    next = (next + count) % count;
    setInspectedId(layout.blocks[next].sessionId);
  }
  function navigatePanel(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") clearInspection();
  }
  function previousHarvest() {
    browse(-1);
  }
  function nextHarvest() {
    browse(1);
  }
  const clearAction = { label: "Clear filters", run: onClearFilters };
  const startAction = { label: "Start focus", run: onStartFocus };
  const monthName = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  let caption = <HarvestCaption text={`No harvests in ${monthName} yet.`} action={startAction} />;
  if (filtered)
    caption = <HarvestCaption text="No matching harvests this month." action={clearAction} />;
  return (
    <>
      <HarvestMonthScene
        layout={layout}
        season={season}
        inspectedId={inspectedId}
        detailId={detailId}
        onInspect={setInspectedId}
      />
      {/* An empty month still shows its plinth, with nothing on it, rather than giving way to a message. */}
      {isEmptyMonth(layout) ? (
        caption
      ) : (
        <div className="solanum-month-panel" onKeyDown={navigatePanel}>
          <div className="solanum-harvest-browse">
            <button aria-label="Previous harvest" onClick={previousHarvest}>
              ‹
            </button>
            <span className="solanum-harvest-position">
              {inspected
                ? `${inspectedIndex + 1} / ${layout.blocks.length}`
                : `${layout.blocks.length} harvests`}
            </span>
            <button aria-label="Next harvest" onClick={nextHarvest}>
              ›
            </button>
            <button className="solanum-subtle" disabled={!inspected} onClick={clearInspection}>
              Month summary
            </button>
          </div>
          {inspected ? (
            <HarvestDetail block={inspected} id={detailId} />
          ) : (
            <HarvestSummary summary={summary} period="month" />
          )}
        </div>
      )}
    </>
  );
}
