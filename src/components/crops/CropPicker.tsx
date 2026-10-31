import { CROPS, isCropId, type CropId } from "../../lib/crops/catalog";
import type { ChangeEvent } from "react";

interface CropPickerProps {
  value: CropId;
  onChange(crop: CropId): void;
}

export function CropPicker({ value, onChange }: CropPickerProps) {
  function changeCrop(event: ChangeEvent<HTMLSelectElement>) {
    if (isCropId(event.target.value)) onChange(event.target.value);
  }
  return (
    <label className="solanum-field">
      Crop
      <select value={value} onChange={changeCrop}>
        {Object.entries(CROPS).map(([id, crop]) => (
          <option key={id} value={id}>
            {crop.emoji} {crop.name}
          </option>
        ))}
      </select>
    </label>
  );
}
