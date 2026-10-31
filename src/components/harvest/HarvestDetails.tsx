import { CROPS } from "../../lib/crops/catalog";
import type { HarvestDay } from "../../lib/harvest/model";
import type { SolanumHost } from "../../types/host";

export function HarvestDetails({ day, host }: { day: HarvestDay; host: SolanumHost }) {
  return (
    <section className="solanum-day-details" aria-label="Harvest details" aria-live="polite">
      <h3>
        {day.date.toLocaleDateString(undefined, { month: "long", day: "numeric" })} ·{" "}
        {Math.round(day.minutes)} min
      </h3>
      {day.entries.length === 0 ? (
        <p>No focused work for this selection.</p>
      ) : (
        day.entries.map(({ session: s, minutes }) => (
          <article key={s.sessionId}>
            <strong>
              {CROPS[s.crop].emoji} {CROPS[s.crop].name} · {Math.round(minutes)} min
            </strong>
            <span className="solanum-hint">
              {" "}
              ·{" "}
              {s.focusEndedAt !== null
                ? "Harvested"
                : s.status === "cancelled"
                  ? "Partial crop"
                  : "Growing"}
              {s.source && ` · ${s.source === "seed" ? "Demo" : "Debug"}`}
            </span>
            <div className="solanum-hint">
              {new Date(s.startedAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {Math.round(s.durationMs / 60_000)} min planned
            </div>
            <div>
              {s.tags.map((t) => (
                <span className="solanum-tag" key={t}>
                  #{t}
                </span>
              ))}
            </div>
            {s.notePath && (
              <button className="solanum-note-link" onClick={() => host.openNote(s.notePath!)}>
                {s.notePath}
              </button>
            )}
          </article>
        ))
      )}
    </section>
  );
}
