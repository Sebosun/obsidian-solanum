import { CROPS, isCropId, type CropId } from "../../lib/crops/catalog";

export function CropPicker({ value, onChange }: { value: CropId; onChange: (crop: CropId) => void }) {
  return <label className="solanum-field">Crop<select value={value} onChange={(e) => { if (isCropId(e.target.value)) onChange(e.target.value); }}>
    {Object.entries(CROPS).map(([id, crop]) => <option key={id} value={id}>{crop.emoji} {crop.name}</option>)}
  </select></label>;
}
