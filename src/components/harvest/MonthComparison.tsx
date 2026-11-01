import type { MonthSummary } from "@/lib/harvest/month";
import { formatFocus } from "@/lib/time";

interface MonthComparisonProps {
  month: Date;
  current: MonthSummary;
  previous: MonthSummary;
}

export function MonthComparison({ month, current, previous }: MonthComparisonProps) {
  const previousMonth = new Date(month.getFullYear(), month.getMonth() - 1, 1);
  const today = new Date();
  const isCurrentMonth =
    month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const delta = current.minutes - previous.minutes;
  let change = "Same focused time as last month";
  if (previous.minutes === 0) change = "No focus recorded last month";
  else if (delta !== 0)
    change = `${Math.round((Math.abs(delta) / previous.minutes) * 100)}% ${delta > 0 ? "more" : "less"} focused time`;
  return (
    <div className="solanum-insight-block">
      <h3>Month comparison</h3>
      <p className="solanum-comparison-change">{change}</p>
      <table className="solanum-comparison">
        <caption>
          {isCurrentMonth ? "Month to date vs full previous month" : "Calendar-month totals"}
        </caption>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">{month.toLocaleDateString(undefined, { month: "short" })}</th>
            <th scope="col">{previousMonth.toLocaleDateString(undefined, { month: "short" })}</th>
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
