import type { HarvestBlock } from "@/lib/harvest/month";
import { CROPS } from "@/lib/crops/catalog";
import { formatFocus } from "@/lib/time";

interface HarvestDetailProps {
  block: HarvestBlock;
  id: string;
}

/** A custom inspection card, never a native title or Obsidian hover label. */
export function HarvestDetail({ block, id }: HarvestDetailProps) {
  const crop = CROPS[block.crop];
  const date = new Date(block.startedAt);
  return (
    <div id={id} role="tooltip" className="solanum-harvest-detail">
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
    </div>
  );
}
