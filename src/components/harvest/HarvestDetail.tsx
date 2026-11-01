import { useId } from "react";
import { SrLabel } from "@/components/app/SrLabel";
import type { HarvestBlock } from "@/lib/harvest/month";
import { CROPS } from "@/lib/crops/catalog";
import { formatFocus } from "@/lib/time";

interface HarvestDetailProps {
  block: HarvestBlock;
  id: string;
}

/** Session details in the panel below the harvest, shared by pointer and keyboard inspection. */
export function HarvestDetail({ block, id }: HarvestDetailProps) {
  const labelId = useId();
  const crop = CROPS[block.crop];
  const date = new Date(block.startedAt);
  return (
    <section
      id={id}
      aria-labelledby={labelId}
      className="solanum-harvest-detail"
      aria-live="polite"
    >
      <SrLabel id={labelId}>Harvest details</SrLabel>
      <strong>
        <span aria-hidden="true">{crop.emoji} </span>
        {crop.name}
      </strong>
      <span>
        {formatFocus(block.minutes)}
        {block.progress < 1 && " · Growing"}
      </span>
      <time dateTime={date.toISOString()}>
        {date.toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </time>
      {block.tags.length > 0 && (
        <span className="solanum-harvest-detail-tags">
          {block.tags.map((tag) => (
            <span className="solanum-tag" key={tag}>
              {tag}
            </span>
          ))}
        </span>
      )}
      {block.notePath && <span className="solanum-harvest-detail-note">{block.notePath}</span>}
    </section>
  );
}
