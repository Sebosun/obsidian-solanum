import type { MonthSummary } from "@/lib/harvest/month";
import { formatFocus } from "@/lib/time";

interface HarvestComparisonProps {
  date: Date;
  period: "month" | "year";
  current: MonthSummary;
  previous: MonthSummary;
}

export function HarvestComparison({ date, period, current, previous }: HarvestComparisonProps) {
  const previousDate =
    period === "month"
      ? new Date(date.getFullYear(), date.getMonth() - 1, 1)
      : new Date(date.getFullYear() - 1, 0, 1);
  const today = new Date();
  const isCurrentPeriod =
    date.getFullYear() === today.getFullYear() &&
    (period === "year" || date.getMonth() === today.getMonth());
  const periodName = period === "month" ? "Month" : "Year";
  function periodLabel(value: Date): string {
    if (period === "year") return String(value.getFullYear());
    return value.toLocaleDateString(undefined, { month: "short" });
  }
  const delta = current.minutes - previous.minutes;
  let change = `Same focused time as last ${period}`;
  if (previous.minutes === 0) change = `No focus recorded last ${period}`;
  else if (delta !== 0)
    change = `${Math.round((Math.abs(delta) / previous.minutes) * 100)}% ${delta > 0 ? "more" : "less"} focused time`;
  return (
    <div className={`solanum-insight-block solanum-${period}-comparison`}>
      <h3>{periodName} comparison</h3>
      <p className="solanum-comparison-change">{change}</p>
      <table className="solanum-comparison">
        <caption>
          {isCurrentPeriod
            ? `${periodName} to date vs full previous ${period}`
            : `Calendar-${period} totals`}
        </caption>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">{periodLabel(date)}</th>
            <th scope="col">{periodLabel(previousDate)}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Focused</th>
            <td>{formatFocus(current.minutes)}</td>
            <td>{formatFocus(previous.minutes)}</td>
          </tr>
          <tr>
            <th scope="row">Harvests</th>
            <td>{current.harvests}</td>
            <td>{previous.harvests}</td>
          </tr>
          <tr>
            <th scope="row">Active days</th>
            <td>{current.activeDays}</td>
            <td>{previous.activeDays}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
