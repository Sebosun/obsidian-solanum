import { useId } from "react";
import type { FocusAmount } from "@/lib/harvest/insights";
import { formatFocus } from "@/lib/time";

interface FocusDistributionProps {
  title: string;
  amounts: FocusAmount[];
  total: number;
  description?: string;
}

const VISIBLE_AMOUNTS = 5;

export function FocusDistribution({ title, amounts, total, description }: FocusDistributionProps) {
  const labelId = useId();
  function rows(items: FocusAmount[]) {
    return (
      <ul className="solanum-distribution" aria-labelledby={labelId}>
        {items.map(({ name, minutes }) => {
          const share = total > 0 ? Math.round((minutes / total) * 100) : 0;
          return (
            <li key={name}>
              <div className="solanum-distribution-label">
                <span>{name}</span>
                <span>
                  {formatFocus(minutes)} <small>· {share}%</small>
                </span>
              </div>
              <div className="solanum-distribution-track" aria-hidden="true">
                <span style={{ width: `${share}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <div className="solanum-insight-block">
      <h3 id={labelId}>{title}</h3>
      {description && <p className="solanum-insight-caption">{description}</p>}
      {rows(amounts.slice(0, VISIBLE_AMOUNTS))}
      {amounts.length > VISIBLE_AMOUNTS && (
        <details className="solanum-insight-details">
          <summary>Show {amounts.length - VISIBLE_AMOUNTS} more</summary>
          {rows(amounts.slice(VISIBLE_AMOUNTS))}
        </details>
      )}
    </div>
  );
}
