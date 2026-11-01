import { useId, type MouseEvent } from "react";
import { SrLabel } from "@/components/app/SrLabel";
import type { CropId } from "@/lib/crops/catalog";
import { useAppStore } from "@/state/hooks";
import { CropPicker } from "@/components/crops/CropPicker";
import { ControlIcon } from "@/components/timer/ControlIcon";
import { SessionDetailsForm } from "@/components/timer/SessionDetailsForm";

export function TimerSetup() {
  const presetsId = useId();
  const draft = useAppStore((state) => state.draft);
  const presets = useAppStore((state) => state.presets);
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
      <div className="solanum-start-row">
        <button
          className="solanum-start"
          aria-label="Start focus"
          disabled={busy || conflicts.length > 0}
          onClick={handleStart}
        >
          <ControlIcon kind="play" />
        </button>
      </div>
      <div
        className="solanum-presets"
        role="group"
        aria-labelledby={presetsId}
        onClick={changeDuration}
      >
        <SrLabel id={presetsId}>Focus duration</SrLabel>
        {presets.map((minutes) => (
          <button key={minutes} data-minutes={minutes} aria-pressed={draft.minutes === minutes}>
            {minutes} min
          </button>
        ))}
      </div>
      <CropPicker value={draft.crop} onChange={changeCrop} />
      <SessionDetailsForm />
    </>
  );
}
