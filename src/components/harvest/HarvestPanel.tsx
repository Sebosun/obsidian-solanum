import { useState } from "react";
import type { SolanumHost } from "../../host";
import type { Revision } from "../../timer";
import { buildHarvestMonth } from "../../lib/harvest/model";
import { HarvestScene } from "./HarvestScene";
import { HarvestDetails } from "./HarvestDetails";
import { HarvestDayList } from "./HarvestDayList";

export function HarvestPanel({ host, sessions, initialMonth }: { host: SolanumHost; sessions: Revision[]; initialMonth?: Date }) {
  const [month, setMonth] = useState(initialMonth ?? new Date());
  const [selectedKey, setSelected] = useState<string | null>(null);
  const [hoverKey, setHover] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [notePath, setNotePath] = useState("");
  const days = buildHarvestMonth(sessions, month, { tag, notePath });
  const activeKey = hoverKey ?? selectedKey;
  const details = days.find((day) => day.key === activeKey);
  const tags = [...new Set([...host.tags(), ...sessions.flatMap((s) => s.tags)])].sort();
  const changeMonth = (delta: number) => { setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1)); setSelected(null); setHover(null); };
  return <section className="solanum-harvest">
    <div className="solanum-month-nav sol:flex sol:items-center sol:justify-between sol:gap-1.5"><button aria-label="Previous month" onClick={() => changeMonth(-1)}>‹</button>
      <h2>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
      <button aria-label="Next month" onClick={() => changeMonth(1)}>›</button></div>
    <p className="solanum-month-total sol:text-center sol:text-xs sol:text-(--text-muted) sol:mt-0 sol:mb-5">{Math.round(days.reduce((sum, day) => sum + day.minutes, 0))} min this month</p>
    <div className="solanum-filters sol:flex sol:gap-[7px] sol:mb-4"><select aria-label="Filter by tag" value={tag} onChange={(e) => setTag(e.target.value)}><option value="">All tags</option>{tags.map((t) => <option key={t} value={t}>#{t}</option>)}</select>
      <select aria-label="Filter by note" value={notePath} onChange={(e) => setNotePath(e.target.value)}><option value="">All notes</option>{[...new Set(sessions.map((s) => s.notePath).filter((p): p is string => !!p))].sort().map((p) => <option key={p}>{p}</option>)}</select></div>
    <HarvestScene days={days} activeKey={activeKey} assetUrl={host.assetUrl} onHover={setHover} onSelect={setSelected} />
    <p className="solanum-hint">Hover to preview; click or tap to pin a day. More focus grows a fuller plot (25 min per crop-equivalent). Up to 9 models per day; all sessions remain in details. Days use this device’s time zone.</p>
    <HarvestDayList days={days} selectedKey={selectedKey} onSelect={setSelected} />
    {details ? <HarvestDetails day={details} host={host} /> : <p className="solanum-hint">Choose a plot to explore your harvest.</p>}
  </section>;
}
