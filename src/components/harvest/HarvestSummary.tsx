import { useId, type ReactNode } from "react";
import { SrLabel } from "@/components/app/SrLabel";
import { CROPS, CROP_IDS } from "@/lib/crops/catalog";
import type { MonthSummary } from "@/lib/harvest/month";
import { formatFocus } from "@/lib/time";

interface HarvestSummaryProps {
  summary: MonthSummary;
  period: "month" | "year";
  children?: ReactNode;
}

export function HarvestSummary({ summary, period, children }: HarvestSummaryProps) {
  const summaryId = useId();
  const cropsId = useId();
  const tagsId = useId();
  const grown = CROP_IDS.filter((id) => summary.crops[id] > 0);
  return (
    <section className="solanum-harvest-summary" aria-labelledby={summaryId}>
      <SrLabel id={summaryId}>{period === "month" ? "Month summary" : "Year summary"}</SrLabel>
      <dl className="solanum-summary-stats">
        <div>
          <dt>Focused</dt>
          <dd>{formatFocus(summary.minutes)}</dd>
        </div>
        <div>
          <dt>Harvests</dt>
          <dd>{summary.harvests}</dd>
        </div>
        <div>
          <dt>Active days</dt>
          <dd>{summary.activeDays}</dd>
        </div>
      </dl>
      {period === "year" && grown.length > 0 && (
        <>
          <SrLabel id={cropsId}>Crops grown</SrLabel>
          <ul className="solanum-summary-crops" aria-labelledby={cropsId}>
            {grown.map((id) => (
              <li key={id}>
                <span aria-hidden="true">{CROPS[id].emoji}</span> {CROPS[id].name}
                <b>{summary.crops[id]}</b>
              </li>
            ))}
          </ul>
        </>
      )}
      {period === "year" && summary.tags.length > 0 && (
        <>
          <p id={tagsId} className="solanum-summary-label">
            Most used tags
          </p>
          <ul className="solanum-summary-tags" aria-labelledby={tagsId}>
            {summary.tags.map(({ tag, count }) => (
              <li className="solanum-tag" key={tag}>
                {tag}
                <b>{count}</b>
              </li>
            ))}
          </ul>
        </>
      )}
      {children}
    </section>
  );
}
