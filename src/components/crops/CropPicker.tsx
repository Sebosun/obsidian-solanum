import { CROPS, isCropId, type CropId } from "@/lib/crops/catalog";
import type { MouseEvent } from "react";

interface CropPickerProps {
  value: CropId;
  onChange(crop: CropId): void;
}

export function CropPicker({ value, onChange }: CropPickerProps) {
  function pick(event: MouseEvent<HTMLButtonElement>) {
    const crop = event.currentTarget.dataset.crop;
    if (isCropId(crop)) onChange(crop);
  }
  return (
    <div className="solanum-field">
      <span id="solanum-crop-label">Crop</span>
      <div className="solanum-crops" role="radiogroup" aria-labelledby="solanum-crop-label">
        {Object.entries(CROPS).map(([id, crop]) => (
          <button key={id} role="radio" aria-checked={value === id} data-crop={id} onClick={pick}>
            <span className="solanum-crop-emoji" aria-hidden="true">
              {crop.emoji}
            </span>
            <span>{crop.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
