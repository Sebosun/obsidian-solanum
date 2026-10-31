import { HarvestPeriodNav } from "@/components/harvest/HarvestPeriodNav";
import { HarvestViewToggle, type HarvestView } from "@/components/harvest/HarvestViewToggle";

interface HarvestHeaderProps {
  view: HarvestView;
  /** Any date in the period on show. */
  month: Date;
  today: Date;
  /** Focused minutes in the period on show. */
  minutes: number;
  onView(view: HarvestView): void;
  onPrevious(): void;
  onNext(): void;
  onToday(): void;
}

/** What names the period on show and moves between periods: the range toggle and the navigation. */
export function HarvestHeader({
  view,
  month,
  today,
  minutes,
  onView,
  onPrevious,
  onNext,
  onToday,
}: HarvestHeaderProps) {
  const isCurrent =
    month.getFullYear() === today.getFullYear() &&
    (view === "year" || month.getMonth() === today.getMonth());
  const title =
    view === "year"
      ? String(month.getFullYear())
      : month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return (
    <>
      <HarvestViewToggle view={view} onChange={onView} />
      <HarvestPeriodNav
        title={title}
        unit={view}
        minutes={minutes}
        onPrevious={onPrevious}
        onNext={onNext}
        onCurrent={isCurrent ? undefined : onToday}
      />
    </>
  );
}
