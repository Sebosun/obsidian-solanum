interface HarvestUnavailableProps {
  onRetry(): void;
}

export function HarvestUnavailable({ onRetry }: HarvestUnavailableProps) {
  return (
    <div className="solanum-empty-harvest" role="alert">
      <p>Farm unavailable</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  );
}
