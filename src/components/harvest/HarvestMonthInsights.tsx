import { HarvestFocusBreakdown } from "@/components/harvest/HarvestFocusBreakdown";
import type { MonthInsights } from "@/lib/harvest/insights";
import type { MonthSummary } from "@/lib/harvest/month";
import { FocusActivityChart } from "@/components/harvest/FocusActivityChart";
import { HarvestComparison } from "@/components/harvest/HarvestComparison";

interface HarvestMonthInsightsProps {
  month: Date;
  summary: MonthSummary;
  insights: MonthInsights;
}

export function HarvestMonthInsights({ month, summary, insights }: HarvestMonthInsightsProps) {
  return (
    <div className="solanum-period-insights">
      <FocusActivityChart entries={insights.days} period="month" />
      <HarvestFocusBreakdown insights={insights} minutes={summary.minutes} />
      <HarvestComparison
        date={month}
        period="month"
        current={summary}
        previous={insights.previous}
      />
    </div>
  );
}
