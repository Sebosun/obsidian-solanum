import { useId } from "react";
import type { DailyFocus } from "@/lib/harvest/insights";
import { formatFocus } from "@/lib/time";

interface FocusActivityChartProps {
  entries: DailyFocus[];
  period: "month" | "year";
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 100;
const BAR_GAP = 3;

export function FocusActivityChart({ entries, period }: FocusActivityChartProps) {
  const title = period === "month" ? "Daily focus" : "Monthly focus";
  const totalsLabel = period === "month" ? "Daily totals" : "Monthly totals";
  const labelId = useId();
  const descriptionId = useId();
  const peak = Math.max(0, ...entries.map((day) => day.minutes));
  const maximum = Math.max(1, peak);
  const pitch = CHART_WIDTH / entries.length;
  return (
    <div className="solanum-insight-block">
      <div className="solanum-insight-heading">
        <h3 id={labelId}>{title}</h3>
        <span>Peak {formatFocus(peak)}</span>
      </div>
      <svg
        className="solanum-daily-chart"
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
      >
        <desc id={descriptionId}>
          Focused time for each {period === "month" ? "day of the month" : "month of the year"}.
          Exact values are in {totalsLabel} below.
        </desc>
        {entries.map(({ date, minutes }, index) => {
          const height = Math.max(2, (minutes / maximum) * CHART_HEIGHT);
          return (
            <g key={date.getTime()}>
              <rect
                x={index * pitch + BAR_GAP / 2}
                y={CHART_HEIGHT - height}
                width={pitch - BAR_GAP}
                height={height}
                rx="2"
                className={minutes > 0 ? "solanum-daily-bar" : "solanum-daily-zero"}
              />
            </g>
          );
        })}
      </svg>
      <div
        className="solanum-daily-ticks"
        style={{ gridTemplateColumns: `repeat(${entries.length}, 1fr)` }}
        aria-hidden="true"
      >
        {entries.map(({ date }, index) => {
          const day = date.getDate();
          let label = String(day);
          if (period === "month") {
            if (day !== 1 && day % 7 !== 0 && day !== entries.length) return null;
          } else {
            if (index % 3 !== 0 && index !== entries.length - 1) return null;
            label = date.toLocaleDateString(undefined, { month: "short" });
          }
          return (
            <span key={date.getTime()} style={{ gridColumn: index + 1 }}>
              {label}
            </span>
          );
        })}
      </div>
      <details className="solanum-insight-details">
        <summary>{totalsLabel}</summary>
        <ul className="solanum-daily-totals">
          {entries.map(({ date, minutes }) => (
            <li key={date.getTime()}>
              <time
                dateTime={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`}
              >
                {date.toLocaleDateString(undefined, {
                  month: "short",
                  day: period === "month" ? "numeric" : undefined,
                })}
              </time>
              <span>{formatFocus(minutes)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
