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
  return (
    <div className="solanum-view-toggle" role="group" aria-label="Harvest range">
      {VIEWS.map((item) => (
        <button key={item.id} aria-pressed={view === item.id} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
