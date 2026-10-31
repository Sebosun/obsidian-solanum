import type { CropId } from "@/lib/crops/catalog";

export interface TimerDraft {
  minutes: number;
  crop: CropId;
  /** Plain tag names, without the leading "#". */
  tags: string[];
  note: string;
}
