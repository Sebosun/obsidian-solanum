import { useMemo, useState } from "react";
import { useAppStore } from "@/state/hooks";
import { harvestFilterOptions } from "@/lib/harvest/filters";
import { layoutHarvestBlocks, summarizeMonth } from "@/lib/harvest/month";
import { layoutYearStacks, summarizeYear } from "@/lib/harvest/year";
import { resolveSeason } from "@/lib/scene/seasons";
import { formatFocus } from "@/lib/time";
import { HarvestEmpty } from "@/components/harvest/HarvestEmpty";
import { HarvestFilters } from "@/components/harvest/HarvestFilters";
import { HarvestMonthScene } from "@/components/scenes/HarvestMonthScene";
import { HarvestMonthSummary } from "@/components/harvest/HarvestMonthSummary";
import { HarvestPeriodNav } from "@/components/harvest/HarvestPeriodNav";
import { HarvestViewToggle, type HarvestView } from "@/components/harvest/HarvestViewToggle";
import { HarvestYearScene } from "@/components/scenes/HarvestYearScene";

interface HarvestPanelProps {
  initialMonth?: Date;
}

const MONTHS_PER_YEAR = 12;

export function HarvestPanel({ initialMonth }: HarvestPanelProps) {
  const history = useAppStore((state) => state.sessions);
  const conflicts = useAppStore((state) => state.conflicts);
  const seasonChoice = useAppStore((state) => state.season);
  const sessions = useMemo(
    () =>
      history.filter(
        (session) => !conflicts.some((conflict) => conflict.sessionId === session.sessionId),
      ),
    [history, conflicts],
  );
  const [view, setView] = useState<HarvestView>("month");
  const [today] = useState(() => new Date());
  const [month, setMonth] = useState(initialMonth ?? today);
  const [tag, setTag] = useState("");
  const [notePath, setNotePath] = useState("");
  const filter = useMemo(() => ({ tag, notePath }), [tag, notePath]);
  const year = month.getFullYear();

  const layout = useMemo(
    () => (view === "month" ? layoutHarvestBlocks(sessions, month, filter) : null),
    [view, sessions, month, filter],
  );
  const summary = useMemo(() => summarizeMonth(sessions, month, filter), [sessions, month, filter]);
  const yearMonths = useMemo(
    () => (view === "year" ? summarizeYear(sessions, year, filter) : []),
    [view, sessions, year, filter],
  );
  const yearLayout = useMemo(() => layoutYearStacks(yearMonths), [yearMonths]);
  const yearTotal = yearMonths.reduce((sum, item) => sum + item.minutes, 0);
  const total = view === "year" ? yearTotal : summary.minutes;
  const { tags, notes } = useMemo(() => harvestFilterOptions(sessions), [sessions]);

  function step(direction: number) {
    const delta = view === "year" ? direction * MONTHS_PER_YEAR : direction;
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  }
  function previous() {
    step(-1);
  }
  function next() {
    step(1);
  }
  function backToToday() {
    setMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }
  function openMonth(index: number) {
    setMonth(new Date(year, index, 1));
    setView("month");
  }
  function clearFilters() {
    setTag("");
    setNotePath("");
  }

  const filtered = !!tag || !!notePath;
  let content = <HarvestEmpty filtered={filtered} onClearFilters={clearFilters} />;
  if (view === "year") {
    // An empty year still shows its twelve crates, just empty ones.
    const busiest = yearLayout.stacks.find((stack) => stack.busiest);
    let caption = `Each crate stands for ${formatFocus(yearLayout.crateMinutes)} of focus.`;
    if (busiest) {
      const name = yearMonths[busiest.index].date.toLocaleDateString(undefined, { month: "long" });
      caption += ` Busiest: ${name}, ${formatFocus(busiest.minutes)}.`;
    } else {
      caption = filtered ? "No matching harvests this year." : `No harvests in ${year} yet.`;
    }
    content = (
      <>
        <HarvestYearScene
          year={year}
          months={yearMonths}
          layout={yearLayout}
          onOpenMonth={openMonth}
        />
        <p className="solanum-hint solanum-scene-caption">
          {caption}
          {!busiest && filtered && (
            <>
              {" "}
              <button className="solanum-subtle" onClick={clearFilters}>
                Clear filters
              </button>
            </>
          )}
        </p>
      </>
    );
  } else if (total > 0 && layout) {
    content = (
      <>
        <HarvestMonthScene layout={layout} season={resolveSeason(seasonChoice, month)} />
        <HarvestMonthSummary summary={summary} shown={layout.blocks.length} total={layout.total} />
      </>
    );
  }
  const isCurrent =
    month.getFullYear() === today.getFullYear() &&
    (view === "year" || month.getMonth() === today.getMonth());
  const title =
    view === "year"
      ? String(year)
      : month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <section className="solanum-harvest">
      <HarvestViewToggle view={view} onChange={setView} />
      <HarvestPeriodNav
        title={title}
        unit={view}
        minutes={total}
        onPrevious={previous}
        onNext={next}
        onCurrent={isCurrent ? undefined : backToToday}
      />
      <HarvestFilters
        tags={tags}
        notes={notes}
        tag={tag}
        notePath={notePath}
        onTag={setTag}
        onNote={setNotePath}
      />
      {content}
    </section>
  );
}
