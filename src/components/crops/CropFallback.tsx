import { CROPS, type CropId } from "../../lib/crops/catalog";

export function CropFallback({ crop, progress }: { crop: CropId; progress: number }) {
  return (
    <div
      className="solanum-crop-fallback sol:h-full sol:flex sol:flex-col sol:gap-3.5 sol:justify-center sol:items-center sol:text-(--text-muted)"
      role="img"
      aria-label={`${CROPS[crop].name} crop ${Math.round(progress * 100)}% grown`}
    >
      <span aria-hidden="true">
        {progress >= 1 ? CROPS[crop].emoji : progress > 0.2 ? "🌱" : "🫘"}
      </span>
      <small>{progress >= 1 ? "Ready to harvest" : "Good things take focus"}</small>
    </div>
  );
}
