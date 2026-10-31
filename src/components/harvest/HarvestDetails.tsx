import type { HarvestDay } from "@/lib/harvest/model";
import { HarvestEntry } from "@/components/harvest/HarvestEntry";

interface HarvestDetailsProps {
  day: HarvestDay;
}

export function HarvestDetails({ day }: HarvestDetailsProps) {
  const date = day.date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  return (
    <section className="solanum-day-details" aria-label="Harvest details" aria-live="polite">
      <h3>
        {date} · {Math.round(day.minutes)} min
      </h3>
      {day.entries.length === 0 && <p>No harvests</p>}
      {day.entries.map((entry) => (
        <HarvestEntry
          key={entry.session.sessionId}
          session={entry.session}
          minutes={entry.minutes}
        />
      ))}
    </section>
  );
}
