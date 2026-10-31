import { useEffect, useId, useState } from "react";
import { SrLabel } from "@/components/app/SrLabel";
import { HarvestUnavailable } from "@/components/harvest/HarvestUnavailable";

interface HarvestLoadingProps {
  onRetry(): void;
}

export function HarvestLoading({ onRetry }: HarvestLoadingProps) {
  const labelId = useId();
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setExpired(true), 8000);
    return () => window.clearTimeout(timeout);
  }, []);
  if (expired) return <HarvestUnavailable onRetry={onRetry} />;
  return (
    <div role="status" aria-labelledby={labelId} className="solanum-scene-loading">
      <SrLabel id={labelId}>Loading harvest</SrLabel>
      <span className="solanum-spinner" aria-hidden="true" />
    </div>
  );
}
