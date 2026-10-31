import { PRESETS } from "../../lib/settings";
import { normalizeTags } from "../../lib/timer/selectors";
import type { Revision } from "../../lib/timer/types";
import type { TimerDraft } from "../../types/timer-ui";
import type { Action, SolanumHost } from "../../types/host";
import { CropPicker } from "../crops/CropPicker";
import { SessionDetailsForm } from "./SessionDetailsForm";

interface TimerSetupProps {
  draft: TimerDraft;
  onChange: (draft: TimerDraft) => void;
  host: SolanumHost;
  sessions: Revision[];
  disabled: boolean;
  act: Action;
}

export function TimerSetup({ draft, onChange, host, sessions, disabled, act }: TimerSetupProps) {
  function changeCrop(crop: TimerDraft["crop"]) {
    onChange({ ...draft, crop });
  }

  function changeDuration(event: React.MouseEvent<HTMLDivElement>) {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-minutes]");
    if (!button) return;
    onChange({ ...draft, minutes: Number(button.dataset.minutes) });
  }

  async function startSession() {
    if (draft.note && !host.notes().includes(draft.note)) {
      throw new Error("Choose an existing note from this vault.");
    }
    await host.timer.start({
      crop: draft.crop,
      durationMs: draft.minutes * 60_000,
      breakMs: host.settings.breakMinutes * 60_000,
      autoBreak: host.settings.autoBreak,
      tags: normalizeTags(draft.tags.split(/[\s,]+/)),
      notePath: draft.note || null,
    });
  }

  function startFocus() {
    host.unlockAudio();
    void act(startSession);
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
      <SessionDetailsForm draft={draft} onChange={onChange} host={host} sessions={sessions} />
      <button className="mod-cta solanum-start" disabled={disabled} onClick={startFocus}>
        Start focus
      </button>
    </>
  );
}
