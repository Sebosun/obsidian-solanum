import { useId } from "react";
import { SrLabel } from "@/components/app/SrLabel";
import { CROPS, CROP_IDS } from "@/lib/crops/catalog";
import type { MonthSummary } from "@/lib/harvest/month";
import { formatFocus } from "@/lib/time";

interface HarvestMonthSummaryProps {
  summary: MonthSummary;
  /** Blocks drawn and harvests in the month; fewer are drawn only when the month is very busy. */
  shown: number;
  total: number;
}

export function HarvestMonthSummary({ summary, shown, total }: HarvestMonthSummaryProps) {
  const summaryId = useId();
  const cropsId = useId();
  const tagsId = useId();
  const grown = CROP_IDS.filter((id) => summary.crops[id] > 0);
  return (
    <section className="solanum-month-summary" aria-labelledby={summaryId}>
      <SrLabel id={summaryId}>Month summary</SrLabel>
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
      {grown.length > 0 && (
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
      {summary.tags.length > 0 && (
        <>
          <SrLabel id={tagsId}>Most used tags</SrLabel>
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
      <p className="solanum-hint">
        One block per harvest; longer sessions are taller.
        {shown < total && ` Showing ${shown} of ${total}, spread evenly across the month.`}
      </p>
    </section>
  );
}
