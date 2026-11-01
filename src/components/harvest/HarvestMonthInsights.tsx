import type { MonthInsights } from "@/lib/harvest/insights";
import type { MonthSummary } from "@/lib/harvest/month";
import { DailyFocusChart } from "@/components/harvest/DailyFocusChart";
import { FocusDistribution } from "@/components/harvest/FocusDistribution";
import { FocusPatterns } from "@/components/harvest/FocusPatterns";
import { HarvestComparison } from "@/components/harvest/HarvestComparison";

interface HarvestMonthInsightsProps {
  month: Date;
  summary: MonthSummary;
  insights: MonthInsights;
}

export function HarvestMonthInsights({ month, summary, insights }: HarvestMonthInsightsProps) {
  return (
    <div className="solanum-month-insights">
      <DailyFocusChart days={insights.days} />
      <div className="solanum-insight-grid">
        <FocusPatterns title="Most focused weekdays" amounts={insights.weekdays} />
        <FocusPatterns title="Most focused time of day" amounts={insights.periods} />
      </div>
      <div className="solanum-insight-grid">
        <FocusDistribution
          title="Tags"
          amounts={insights.tags}
          total={summary.minutes}
          description="Share of focused time. Tags can overlap."
        />
        <FocusDistribution
          title="Notes"
          amounts={insights.notes}
          total={summary.minutes}
          description="Share of focused time by linked note."
        />
      </div>
      <HarvestComparison
        date={month}
        period="month"
        current={summary}
        previous={insights.previous}
      />
    </div>
  );
}
