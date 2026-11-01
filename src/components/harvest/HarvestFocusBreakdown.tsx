import type { FocusBreakdown } from "@/lib/harvest/insights";
import { FocusDistribution } from "@/components/harvest/FocusDistribution";
import { FocusPatterns } from "@/components/harvest/FocusPatterns";

interface HarvestFocusBreakdownProps {
  insights: FocusBreakdown;
  minutes: number;
}

export function HarvestFocusBreakdown({ insights, minutes }: HarvestFocusBreakdownProps) {
  return (
    <>
      <div className="solanum-insight-grid">
        <FocusPatterns title="Most focused weekdays" amounts={insights.weekdays} />
        <FocusPatterns title="Most focused time of day" amounts={insights.periods} />
      </div>
      <div className="solanum-insight-grid">
        <FocusDistribution
          title="Tags"
          amounts={insights.tags}
          total={minutes}
          description="Share of focused time. Tags can overlap."
        />
        <FocusDistribution
          title="Notes"
          amounts={insights.notes}
          total={minutes}
          description="Share of focused time by linked note."
        />
      </div>
    </>
  );
}
