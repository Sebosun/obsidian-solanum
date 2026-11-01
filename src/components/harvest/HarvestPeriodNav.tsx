interface HarvestPeriodNavProps {
  title: string;
  /** "month" or "year": names the buttons and the total line. */
  unit: "month" | "year";
  minutes: number;
  onPrevious(): void;
  onNext(): void;
  /** Present only while another period than the current one is showing. */
  onCurrent?: () => void;
}

export function HarvestPeriodNav({
  title,
  unit,
  minutes,
  onPrevious,
  onNext,
  onCurrent,
}: HarvestPeriodNavProps) {
  return (
    <>
      <div className="solanum-month-nav sol:flex sol:items-center sol:justify-between sol:gap-1.5">
        <button aria-label={`Previous ${unit}`} onClick={onPrevious}>
          ‹
        </button>
        <h2>{title}</h2>
        <button aria-label={`Next ${unit}`} onClick={onNext}>
          ›
        </button>
      </div>
      <p className="solanum-month-total sol:text-center sol:text-[11px] sol:text-(--text-muted) sol:mt-0 sol:mb-3.5 sol:tabular-nums">
        <span>
          {Math.round(minutes)} min this {unit}
        </span>
        {onCurrent && (
          <>
            {" · "}
            <button className="solanum-subtle" onClick={onCurrent}>
              Back to this {unit}
            </button>
          </>
        )}
      </p>
    </>
  );
}
