import { useMemo, useState } from "react";
import { useAppStore, useServices } from "@/state/hooks";
import { layoutHarvestBlocks, summarizeMonth } from "@/lib/harvest/month";
import { buildHarvestYear } from "@/lib/harvest/year";
import { resolveSeason } from "@/lib/scene/seasons";
import { HarvestEmpty } from "@/components/harvest/HarvestEmpty";
import { HarvestFilters } from "@/components/harvest/HarvestFilters";
import { HarvestMonthScene } from "@/components/harvest/HarvestMonthScene";
import { HarvestMonthSummary } from "@/components/harvest/HarvestMonthSummary";
import { HarvestPeriodNav } from "@/components/harvest/HarvestPeriodNav";
import { HarvestViewToggle, type HarvestView } from "@/components/harvest/HarvestViewToggle";
import { HarvestYear } from "@/components/harvest/HarvestYear";

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
  const [month, setMonth] = useState(initialMonth ?? new Date());
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
    () => (view === "year" ? buildHarvestYear(sessions, year, filter) : []),
    [view, sessions, year, filter],
  );
  const yearTotal = yearMonths.reduce((sum, item) => sum + item.minutes, 0);
  const total = view === "year" ? yearTotal : summary.minutes;
  const tags = [
    ...new Set([...services.tags(), ...sessions.flatMap((session) => session.tags)]),
  ].sort();
  const notes = [
    ...new Set(sessions.flatMap((session) => (session.notePath ? [session.notePath] : []))),
  ].sort();

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
  function openMonth(index: number) {
    setMonth(new Date(year, index, 1));
    setView("month");
  }
  function clearFilters() {
    setTag("");
    setNotePath("");
  }

  let content = <HarvestEmpty filtered={!!tag || !!notePath} onClearFilters={clearFilters} />;
  if (total > 0 && view === "year") {
    content = <HarvestYear months={yearMonths} onOpenMonth={openMonth} />;
  } else if (total > 0 && layout) {
    content = (
      <>
        <HarvestMonthScene layout={layout} season={resolveSeason(seasonChoice, month)} />
        <HarvestMonthSummary summary={summary} shown={layout.blocks.length} total={layout.total} />
      </>
    );
  }
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
