import { useId } from "react";
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

export function HarvestViewToggle({ view, onChange }: HarvestViewToggleProps) {
  const labelId = useId();
  return (
    <div className="solanum-view-toggle" role="group" aria-labelledby={labelId}>
      <SrLabel id={labelId}>Harvest range</SrLabel>
      {VIEWS.map((item) => (
        <button key={item.id} aria-pressed={view === item.id} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
