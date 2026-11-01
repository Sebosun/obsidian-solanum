import { useId } from "react";
import type { DailyFocus } from "@/lib/harvest/insights";
import { formatFocus } from "@/lib/time";

interface DailyFocusChartProps {
  days: DailyFocus[];
}

const CHART_WIDTH = 320;
const CHART_HEIGHT = 100;
const BAR_GAP = 3;

export function DailyFocusChart({ days }: DailyFocusChartProps) {
  const labelId = useId();
  const descriptionId = useId();
  const peak = Math.max(0, ...days.map((day) => day.minutes));
  const maximum = Math.max(1, peak);
  const pitch = CHART_WIDTH / days.length;
  return (
    <div className="solanum-insight-block">
      <div className="solanum-insight-heading">
        <h3 id={labelId}>Daily focus</h3>
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
          Focused time for each day of the month. Exact values are in Daily totals below.
        </desc>
        {days.map(({ date, minutes }, index) => {
          const height = Math.max(2, (minutes / maximum) * CHART_HEIGHT);
          const day = date.getDate();
          return (
            <g key={day}>
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
        style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
        aria-hidden="true"
      >
        {days.map(({ date }, index) => {
          const day = date.getDate();
          if (day !== 1 && day % 7 !== 0 && day !== days.length) return null;
          return (
            <span key={day} style={{ gridColumn: index + 1 }}>
              {day}
            </span>
          );
        })}
      </div>
      <details className="solanum-insight-details">
        <summary>Daily totals</summary>
        <ul className="solanum-daily-totals">
          {days.map(({ date, minutes }) => (
            <li key={date.getDate()}>
              <time
                dateTime={`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`}
              >
                {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </time>
              <span>{formatFocus(minutes)}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
