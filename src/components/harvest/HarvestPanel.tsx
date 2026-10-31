import { useMemo, useState, type ReactNode } from "react";
import { useAppStore, useServices } from "@/state/hooks";
import { harvestFilterOptions } from "@/lib/harvest/filters";
import { layoutHarvestBlocks, summarizeMonth } from "@/lib/harvest/month";
import { layoutYearStacks, summarizeYear } from "@/lib/harvest/year";
import { resolveSeason } from "@/lib/scene/seasons";
import { formatFocus } from "@/lib/time";
import { HarvestCaption, type HarvestCaptionAction } from "@/components/harvest/HarvestCaption";
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
  const services = useServices();
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
  function openTimer() {
    services.navigate("timer");
  }
  function clearFilters() {
    setTag("");
    setNotePath("");
  }

  const filtered = !!tag || !!notePath;
  const clearAction = { label: "Clear filters", run: clearFilters };
  const startAction = { label: "Start focus", run: openTimer };
  let content: ReactNode;
  if (view === "year") {
    // An empty year still shows its twelve crates, just empty ones.
    const busiest = yearLayout.stacks.find((stack) => stack.busiest);
    let caption = `Each crate stands for ${formatFocus(yearLayout.crateMinutes)} of focus.`;
    let action: HarvestCaptionAction | undefined;
    if (busiest) {
      const name = yearMonths[busiest.index].date.toLocaleDateString(undefined, { month: "long" });
      caption += ` Busiest: ${name}, ${formatFocus(busiest.minutes)}.`;
    } else {
      caption = filtered ? "No matching harvests this year." : `No harvests in ${year} yet.`;
      if (filtered) action = clearAction;
    }
    content = (
      <>
        <HarvestYearScene
          year={year}
          months={yearMonths}
          layout={yearLayout}
          onOpenMonth={openMonth}
        />
        <HarvestCaption text={caption} action={action} />
      </>
    );
  } else if (layout) {
    // An empty month still shows its plinth, with nothing on it, rather than giving way to a message.
    const empty = total === 0;
    const monthName = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    content = (
      <>
        <HarvestMonthScene layout={layout} season={resolveSeason(seasonChoice, month)} />
        {empty ? (
          <HarvestCaption
            text={
              filtered ? "No matching harvests this month." : `No harvests in ${monthName} yet.`
            }
            action={filtered ? clearAction : startAction}
          />
        ) : (
          <HarvestMonthSummary
            summary={summary}
            shown={layout.blocks.length}
            total={layout.total}
          />
        )}
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
