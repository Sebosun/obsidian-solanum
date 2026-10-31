import { useId } from "react";
import { SrLabel } from "@/components/app/SrLabel";

/** The break, for when 3D is not available: a sleeping cat and a cup, as plain symbols. */
export function BreakFallback() {
  const labelId = useId();
  return (
    <div
      className="solanum-crop-fallback sol:h-full sol:flex sol:flex-col sol:gap-3.5 sol:justify-end sol:pb-6 sol:items-center sol:text-(--text-muted)"
      role="img"
      aria-labelledby={labelId}
    >
      <SrLabel id={labelId}>A cat sleeping beside a cup of coffee</SrLabel>
      <span aria-hidden="true">😴☕</span>
    </div>
  );
}
