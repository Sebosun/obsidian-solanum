import { useEffect, useId, useState } from "react";
import { SrLabel } from "@/components/app/SrLabel";
import { HarvestUnavailable } from "@/components/harvest/HarvestUnavailable";

interface HarvestLoadingProps {
  onRetry(): void;
}

/** How long loading may take before a spinner is drawn at all. */
const SPINNER_DELAY_MS = 700;

export function HarvestLoading({ onRetry }: HarvestLoadingProps) {
  const labelId = useId();
  const [expired, setExpired] = useState(false);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setExpired(true), 8000);
    // A load that is over in a blink should not flash a spinner.
    const delay = window.setTimeout(() => setDrawn(true), SPINNER_DELAY_MS);
    return () => {
      window.clearTimeout(timeout);
      window.clearTimeout(delay);
    };
  }, []);
  if (expired) return <HarvestUnavailable onRetry={onRetry} />;
  return (
    <div role="status" aria-labelledby={labelId} className="solanum-scene-loading">
      <SrLabel id={labelId}>Loading harvest</SrLabel>
      {drawn && <span className="solanum-spinner" aria-hidden="true" />}
    </div>
  );
}
