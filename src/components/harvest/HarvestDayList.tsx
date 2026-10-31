import type { HarvestDay } from "../../lib/harvest/model";

export function HarvestDayList({ days, selectedKey, onSelect }: { days: HarvestDay[]; selectedKey: string | null; onSelect: (key: string) => void }) {
  return <details className="solanum-day-list"><summary>Day list / keyboard navigation</summary>
    <div className="solanum-calendar sol:grid sol:grid-cols-7 sol:gap-1 sol:mt-3" aria-label="Monthly harvest day list">
      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span className="solanum-weekday" key={i}>{d}</span>)}
      {Array.from({ length: days[0].column }, (_, i) => <span key={`empty-${i}`} />)}
      {days.map((day) => <button key={day.key} aria-label={`${day.key}, ${Math.round(day.minutes)} focused minutes`}
        aria-pressed={selectedKey === day.key} className={`solanum-day ${day.items.length ? "has-harvest" : ""}`} onClick={() => onSelect(day.key)}>
        <span>{day.date.getDate()}</span><small>{Math.round(day.minutes)}m</small>
      </button>)}
    </div>
  </details>;
}
