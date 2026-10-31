import { useState, type ChangeEvent } from "react";
import { useAppStore, useServices } from "@/state/hooks";
import { buildHarvestMonth } from "@/lib/harvest/model";
import { HarvestScene } from "@/components/harvest/HarvestScene";
import { HarvestDetails } from "@/components/harvest/HarvestDetails";
import { HarvestDayList } from "@/components/harvest/HarvestDayList";
import { HarvestEmpty } from "@/components/harvest/HarvestEmpty";

interface HarvestPanelProps {
  initialMonth?: Date;
}

export function HarvestPanel({ initialMonth }: HarvestPanelProps) {
  const services = useServices();
  const history = useAppStore((state) => state.sessions);
  const conflicts = useAppStore((state) => state.conflicts);
  const sessions = history.filter(
    (session) => !conflicts.some((conflict) => conflict.sessionId === session.sessionId),
  );
  const [month, setMonth] = useState(initialMonth ?? new Date());
  const [selectedKey, setSelected] = useState<string | null>(null);
  const [hoverKey, setHover] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [notePath, setNotePath] = useState("");
  const days = buildHarvestMonth(sessions, month, { tag, notePath });
  const activeKey = hoverKey ?? selectedKey;
  const details = days.find((day) => day.key === activeKey);
  const total = days.reduce((sum, day) => sum + day.minutes, 0);
  const tags = [
    ...new Set([...services.tags(), ...sessions.flatMap((session) => session.tags)]),
  ].sort();
  const notes = [
    ...new Set(sessions.flatMap((session) => (session.notePath ? [session.notePath] : []))),
  ].sort();

  function changeMonth(delta: number) {
    setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
    setSelected(null);
    setHover(null);
  }
  function previousMonth() {
    changeMonth(-1);
  }
  function nextMonth() {
    changeMonth(1);
  }
  function changeTag(event: ChangeEvent<HTMLSelectElement>) {
    setTag(event.target.value);
  }
  function changeNote(event: ChangeEvent<HTMLSelectElement>) {
    setNotePath(event.target.value);
  }
  function clearFilters() {
    setTag("");
    setNotePath("");
  }

  let scene = (
    <HarvestScene days={days} activeKey={activeKey} onHover={setHover} onSelect={setSelected} />
  );
  if (total === 0)
    scene = <HarvestEmpty filtered={!!tag || !!notePath} onClearFilters={clearFilters} />;

  return (
    <section className="solanum-harvest">
      <div className="solanum-month-nav sol:flex sol:items-center sol:justify-between sol:gap-1.5">
        <button aria-label="Previous month" onClick={previousMonth}>
          ‹
        </button>
        <h2>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
        <button aria-label="Next month" onClick={nextMonth}>
          ›
        </button>
      </div>
      <p className="solanum-month-total sol:text-center sol:text-xs sol:text-(--text-muted) sol:mt-0 sol:mb-5">
        {Math.round(total)} min this month
      </p>
      <div className="solanum-filters sol:flex sol:gap-[7px] sol:mb-4">
        <select aria-label="Filter by tag" value={tag} onChange={changeTag}>
          <option value="">All tags</option>
          {tags.map((value) => (
            <option key={value} value={value}>
              #{value}
            </option>
          ))}
        </select>
        <select aria-label="Filter by note" value={notePath} onChange={changeNote}>
          <option value="">All notes</option>
          {notes.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {scene}
      <HarvestDayList days={days} selectedKey={selectedKey} onSelect={setSelected} />
      {details && <HarvestDetails day={details} />}
    </section>
  );
}
