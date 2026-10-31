import type { MouseEvent } from "react";
import { PRESETS } from "../../lib/settings";
import type { CropId } from "../../lib/crops/catalog";
import { useAppStore } from "../../state/hooks";
import { CropPicker } from "../crops/CropPicker";
import { SessionDetailsForm } from "./SessionDetailsForm";

export function TimerSetup() {
  const draft = useAppStore((state) => state.draft);
  const busy = useAppStore((state) => state.busy);
  const conflicts = useAppStore((state) => state.conflicts);
  const updateDraft = useAppStore((state) => state.updateDraft);
  const startFocus = useAppStore((state) => state.startFocus);
  function changeCrop(crop: CropId) {
    updateDraft({ crop });
  }
  function changeDuration(event: MouseEvent<HTMLDivElement>) {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-minutes]");
    if (button) updateDraft({ minutes: Number(button.dataset.minutes) });
  }
  function handleStart() {
    void startFocus();
  }
  return (
    <>
      <div className="solanum-presets" aria-label="Focus duration" onClick={changeDuration}>
        {PRESETS.map((minutes) => (
          <button key={minutes} data-minutes={minutes} aria-pressed={draft.minutes === minutes}>
            {minutes} min
          </button>
        ))}
      </div>
      <CropPicker value={draft.crop} onChange={changeCrop} />
      <SessionDetailsForm />
      <button
        className="mod-cta solanum-start"
        disabled={busy || conflicts.length > 0}
        onClick={handleStart}
      >
        Start focus
      </button>
    </>
  );
}
