import type { CropId } from "@/lib/crops/catalog";

export interface TimerDraft {
  minutes: number;
  crop: CropId;
  tags: string;
  note: string;
}
