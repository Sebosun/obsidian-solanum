import { useServices } from "@/state/hooks";

interface HarvestEmptyProps {
  filtered: boolean;
  onClearFilters(): void;
}

export function HarvestEmpty({ filtered, onClearFilters }: HarvestEmptyProps) {
  const services = useServices();
  function openTimer() {
    services.navigate("timer");
  }
  let message = "No harvests yet";
  let label = "Start focus";
  let action = openTimer;
  if (filtered) {
    message = "No matching harvests";
    label = "Clear filters";
    action = onClearFilters;
  }
  return (
    <div className="solanum-empty-harvest">
      <svg width="100" height="75" viewBox="0 0 100 75" aria-hidden="true">
        <path d="M8 37 50 15 92 37 50 60Z" fill="#765538" />
        <path d="M8 37v9L50 68V60Z" fill="#493b2d" />
        <path d="M50 60v8L92 46v-9Z" fill="#5d4833" />
        <path d="m24 35 29 15m-18-21 29 15m-18-21 29 15" stroke="#9c7952" strokeWidth="2" />
      </svg>
      <p>{message}</p>
      <button onClick={action}>{label}</button>
    </div>
  );
}
