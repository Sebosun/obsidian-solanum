import { useMemo, useState } from "react";
import { useAppStore, useServices } from "@/state/hooks";
import { buildHarvestMonth } from "@/lib/harvest/model";
import { buildHarvestYear } from "@/lib/harvest/year";
import { resolveSeason } from "@/lib/scene/seasons";
import { HarvestScene } from "@/components/harvest/HarvestScene";
import { HarvestDetails } from "@/components/harvest/HarvestDetails";
import { HarvestEmpty } from "@/components/harvest/HarvestEmpty";
import { HarvestFilters } from "@/components/harvest/HarvestFilters";
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
  const [selectedKey, setSelected] = useState<string | null>(null);
  const [hoverKey, setHover] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [notePath, setNotePath] = useState("");
  const days = buildHarvestMonth(sessions, month, { tag, notePath });
  const year = month.getFullYear();
  const yearMonths = useMemo(
    () => (view === "year" ? buildHarvestYear(sessions, year, { tag, notePath }) : []),
    [view, sessions, year, tag, notePath],
  );
  // Hover only highlights a plot; the details always follow the clicked day.
  const details = days.find((day) => day.key === selectedKey);
  const monthTotal = days.reduce((sum, day) => sum + day.minutes, 0);
  const yearTotal = yearMonths.reduce((sum, item) => sum + item.minutes, 0);
  const total = view === "year" ? yearTotal : monthTotal;
  const tags = [
    ...new Set([...services.tags(), ...sessions.flatMap((session) => session.tags)]),
  ].sort();
  const notes = [
    ...new Set(sessions.flatMap((session) => (session.notePath ? [session.notePath] : []))),
  ].sort();

  function step(direction: number) {
    changeMonth(view === "year" ? direction * MONTHS_PER_YEAR : direction);
  }
  function changeMonth(delta: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
    setSelected(null);
    setHover(null);
  }
  function previous() {
    step(-1);
  }
  function next() {
    step(1);
  }
  function openMonth(index: number) {
    setMonth(new Date(year, index, 1));
    setSelected(null);
    setHover(null);
    setView("month");
  }
  function clearSelection() {
    setSelected(null);
  }
  function clearFilters() {
    setTag("");
    setNotePath("");
  }

  const empty = <HarvestEmpty filtered={!!tag || !!notePath} onClearFilters={clearFilters} />;
  let content = empty;
  if (total > 0 && view === "year") {
    content = <HarvestYear months={yearMonths} onOpenMonth={openMonth} />;
  } else if (total > 0) {
    content = (
      <HarvestScene
        days={days}
        selectedKey={selectedKey}
        hoverKey={hoverKey}
        season={resolveSeason(seasonChoice, month)}
        onHover={setHover}
        onSelect={setSelected}
        onClear={clearSelection}
      />
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
      {view === "month" && details && <HarvestDetails key={details.key} day={details} />}
    </section>
  );
}
