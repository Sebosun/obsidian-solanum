import { useId } from "react";
import { PRESETS } from "../../lib/settings";
import { normalizeTags } from "../../lib/timer/selectors";
import type { Revision } from "../../lib/timer/types";
import type { TimerDraft } from "../../types/timer-ui";
import type { Action, SolanumHost } from "../../types/host";
import { CropPicker } from "../crops/CropPicker";

export function TimerSetup({
  draft,
  onChange,
  host,
  sessions,
  disabled,
  act,
}: {
  draft: TimerDraft;
  onChange: (draft: TimerDraft) => void;
  host: SolanumHost;
  sessions: Revision[];
  disabled: boolean;
  act: Action;
}) {
  const tagsId = useId();
  const notesId = useId();
  const allTags = [...new Set([...host.tags(), ...sessions.flatMap((s) => s.tags)])].sort();
  return (
    <>
      <div
        className="solanum-presets sol:flex sol:flex-wrap sol:justify-center sol:gap-1.5 sol:mb-[22px]"
        aria-label="Focus duration"
      >
        {PRESETS.map((preset) => (
          <button
            key={preset}
            aria-pressed={draft.minutes === preset}
            onClick={() => onChange({ ...draft, minutes: preset })}
          >
            {preset} min
          </button>
        ))}
      </div>
      <CropPicker value={draft.crop} onChange={(crop) => onChange({ ...draft, crop })} />
      <label className="solanum-field">
        Tags
        <input
          list={tagsId}
          placeholder="#work, #study"
          value={draft.tags}
          onChange={(e) => onChange({ ...draft, tags: e.target.value })}
        />
      </label>
      <datalist id={tagsId}>
        {allTags.map((t) => (
          <option key={t} value={`#${t}`} />
        ))}
      </datalist>
      <label className="solanum-field">
        Linked note
        <input
          list={notesId}
          placeholder="Choose a note (optional)"
          value={draft.note}
          onChange={(e) => onChange({ ...draft, note: e.target.value })}
        />
      </label>
      <datalist id={notesId}>
        {host.notes().map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <button
        className="solanum-subtle"
        onClick={() => onChange({ ...draft, note: host.activeNote() ?? "" })}
      >
        Use active note
      </button>
      <button
        className="mod-cta solanum-start"
        disabled={disabled}
        onClick={() => {
          host.unlockAudio();
          void act(async () => {
            if (draft.note && !host.notes().includes(draft.note))
              throw new Error("Choose an existing note from this vault.");
            await host.timer.start({
              crop: draft.crop,
              durationMs: draft.minutes * 60_000,
              breakMs: host.settings.breakMinutes * 60_000,
              autoBreak: host.settings.autoBreak,
              tags: normalizeTags(draft.tags.split(/[\s,]+/)),
              notePath: draft.note || null,
            });
          });
        }}
      >
        Start focus
      </button>
    </>
  );
}
