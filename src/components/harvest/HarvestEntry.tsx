import { CROPS } from "@/lib/crops/catalog";
import type { Revision } from "@/lib/timer/types";
import { useServices } from "@/state/hooks";

interface HarvestEntryProps {
  session: Revision;
  minutes: number;
}

export function HarvestEntry({ session, minutes }: HarvestEntryProps) {
  const services = useServices();
  const crop = CROPS[session.crop];
  let status = "Growing";
  if (session.focusEndedAt !== null) status = "Harvested";
  else if (session.status === "cancelled") status = "Partial crop";
  if (session.source === "seed") status += " · Demo";
  if (session.source === "debug") status += " · Debug";
  const started = new Date(session.startedAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  function openNote() {
    if (session.notePath) services.openNote(session.notePath);
  }
  return (
    <article>
      <strong>
        {crop.emoji} {crop.name} · {Math.round(minutes)} min
      </strong>
      <span className="solanum-hint"> · {status}</span>
      <div className="solanum-hint">
        {started} · {Math.round(session.durationMs / 60_000)} min planned
      </div>
      <div>
        {session.tags.map((tag) => (
          <span className="solanum-tag" key={tag}>
            #{tag}
          </span>
        ))}
      </div>
      {session.notePath && (
        <button className="solanum-note-link" onClick={openNote}>
          {session.notePath}
        </button>
      )}
    </article>
  );
}
