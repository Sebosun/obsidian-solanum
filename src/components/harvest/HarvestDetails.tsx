import type { HarvestDay } from "@/lib/harvest/model";
import { useServices } from "@/state/hooks";
import { HarvestEntry } from "@/components/harvest/HarvestEntry";

interface HarvestDetailsProps {
  day: HarvestDay;
}

export function HarvestDetails({ day }: HarvestDetailsProps) {
  const services = useServices();
  const date = day.date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  // Demo and debug sessions never become notes, so there is nothing to open for them.
  const hasRealSessions = day.entries.some((entry) => entry.session.source === undefined);
  function openDayNote() {
    void services.openDayNote(day.date);
  }
  return (
    <section className="solanum-day-details" aria-label="Harvest details" aria-live="polite">
      <h3>
        {date}
        <span>{Math.round(day.minutes)} min focused</span>
      </h3>
      {day.entries.length === 0 && <p>No harvests</p>}
      {day.entries.map((entry) => (
        <HarvestEntry
          key={entry.session.sessionId}
          session={entry.session}
          minutes={entry.minutes}
        />
      ))}
      {hasRealSessions && (
        <button className="solanum-subtle solanum-day-note-link" onClick={openDayNote}>
          Open day note
        </button>
      )}
    </section>
  );
}
