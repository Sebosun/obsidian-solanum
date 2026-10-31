import { useId, type MouseEvent } from "react";
import { SrLabel } from "@/components/app/SrLabel";
export type HarvestView = "month" | "year";

interface HarvestViewToggleProps {
  view: HarvestView;
  onChange(view: HarvestView): void;
}

const VIEWS: { id: HarvestView; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
];

function isHarvestView(value: string | undefined): value is HarvestView {
  return VIEWS.some((item) => item.id === value);
}

export function HarvestViewToggle({ view, onChange }: HarvestViewToggleProps) {
  const labelId = useId();
  function choose(event: MouseEvent<HTMLButtonElement>) {
    const chosen = event.currentTarget.dataset.view;
    if (isHarvestView(chosen)) onChange(chosen);
  }
  return (
    <div className="solanum-view-toggle" role="group" aria-labelledby={labelId}>
      <SrLabel id={labelId}>Harvest range</SrLabel>
      {VIEWS.map((item) => (
        <button key={item.id} data-view={item.id} aria-pressed={view === item.id} onClick={choose}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
