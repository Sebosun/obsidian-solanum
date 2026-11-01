import { useId } from "react";
import type { FocusAmount } from "@/lib/harvest/insights";
import { formatFocus } from "@/lib/time";

interface FocusPatternsProps {
  title: string;
  amounts: FocusAmount[];
}

export function FocusPatterns({ title, amounts }: FocusPatternsProps) {
  const labelId = useId();
  const peak = Math.max(...amounts.map(({ minutes }) => minutes));
  const leaders = amounts.filter(({ minutes }) => minutes === peak && peak > 0);
  return (
    <div className="solanum-insight-block">
      <h3 id={labelId}>{title}</h3>
      <p className="solanum-pattern-leader">
        {leaders.map(({ name }) => name.split(" · ")[0]).join(" & ") || "No focus yet"}
      </p>
      <ul className="solanum-patterns" aria-labelledby={labelId}>
        {amounts.map(({ name, minutes }) => (
          <li key={name} className={minutes === peak && peak > 0 ? "is-peak" : undefined}>
            <div>
              <span>{name}</span>
              <span>{formatFocus(minutes)}</span>
            </div>
            <div className="solanum-distribution-track" aria-hidden="true">
              <span style={{ width: `${peak > 0 ? (minutes / peak) * 100 : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
