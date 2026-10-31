import { CROPS, type CropId } from "@/lib/crops/catalog";
import { formatTime } from "@/lib/time";

interface CropFallbackProps {
  crop: CropId;
  progress: number;
  remaining: number;
}

export function CropFallback({ crop, progress, remaining }: CropFallbackProps) {
  let symbol = "🫘";
  if (progress >= 1) symbol = CROPS[crop].emoji;
  else if (progress > 0.2) symbol = "🌱";
  return (
    <div
      className="solanum-crop-fallback sol:h-full sol:flex sol:flex-col sol:gap-3.5 sol:justify-center sol:items-center sol:text-(--text-muted)"
      role="img"
      aria-label={`${CROPS[crop].name} crop ${Math.round(progress * 100)}% grown`}
    >
      <span aria-hidden="true">{symbol}</span>
      <span aria-hidden="true" className="solanum-fallback-time">
        {formatTime(remaining)}
      </span>
    </div>
  );
}
