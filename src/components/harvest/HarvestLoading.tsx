import { useEffect, useState } from "react";
import { HarvestUnavailable } from "./HarvestUnavailable";

interface HarvestLoadingProps {
  onRetry(): void;
}

export function HarvestLoading({ onRetry }: HarvestLoadingProps) {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const timeout = window.setTimeout(() => setExpired(true), 8000);
    return () => window.clearTimeout(timeout);
  }, []);
  if (expired) return <HarvestUnavailable onRetry={onRetry} />;
  return (
    <div role="status" aria-label="Loading harvest" className="solanum-scene-loading">
      <span className="solanum-spinner" aria-hidden="true" />
    </div>
  );
}
