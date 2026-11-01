import { useId, type ReactNode } from "react";
import { SrLabel } from "@/components/app/SrLabel";
import type { MonthSummary } from "@/lib/harvest/month";
import { formatFocus } from "@/lib/time";

interface HarvestSummaryProps {
  summary: MonthSummary;
  period: "month" | "year";
  children?: ReactNode;
}

export function HarvestSummary({ summary, period, children }: HarvestSummaryProps) {
  const summaryId = useId();
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
      {children}
    </section>
  );
}
