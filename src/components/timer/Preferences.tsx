import { useState } from "react";
import { PRESETS } from "../../lib/settings";
import type { Action, SolanumHost } from "../../types/host";

export function Preferences({
  host,
  act,
  busy,
}: {
  host: SolanumHost;
  act: Action;
  busy: boolean;
}) {
  const [draft, setDraft] = useState({ ...host.settings });
  return (
    <div className="solanum-preferences sol:flex sol:flex-col sol:gap-2.5 sol:pt-[18px]">
      <label className="solanum-field">
        Default focus
        <select
          value={draft.defaultMinutes}
          onChange={(e) => setDraft({ ...draft, defaultMinutes: Number(e.target.value) })}
        >
          {PRESETS.map((n) => (
            <option key={n} value={n}>
              {n} min
            </option>
          ))}
        </select>
      </label>
      <label className="solanum-field">
        Break minutes
        <input
          type="number"
          min="1"
          max="1440"
          value={draft.breakMinutes}
          onChange={(e) => setDraft({ ...draft, breakMinutes: Number(e.target.value) })}
        />
      </label>
      <div className="solanum-actions">
        {[5, 20].map((n) => (
          <button key={n} onClick={() => setDraft({ ...draft, breakMinutes: n })}>
            {n} min break
          </button>
        ))}
      </div>
      <label>
        <input
          type="checkbox"
          checked={draft.autoBreak}
          onChange={(e) => setDraft({ ...draft, autoBreak: e.target.checked })}
        />{" "}
        Start breaks automatically
      </label>
      <label>
        <input
          type="checkbox"
          checked={draft.sound}
          onChange={(e) => setDraft({ ...draft, sound: e.target.checked })}
        />{" "}
        Completion sound
      </label>
      <label className="solanum-field">
        Volume
        <input
          type="range"
          min="0"
          max="1"
          step=".05"
          value={draft.volume}
          onChange={(e) => setDraft({ ...draft, volume: Number(e.target.value) })}
        />
      </label>
      <div className="solanum-actions">
        <button
          disabled={busy}
          onClick={() =>
            void act(async () => {
              if (
                !Number.isFinite(draft.breakMinutes) ||
                draft.breakMinutes < 1 ||
                draft.breakMinutes > 1440
              )
                throw new Error("Break must be between 1 and 1440 minutes.");
              await host.saveSettings(draft);
            })
          }
        >
          Save preferences
        </button>
        <button onClick={() => host.previewSound()}>Test sound</button>
      </div>
      <small>
        Changes apply to new sessions. Sync the Solanum folder to carry crops between devices. Audio
        needs Obsidian open and may need a tap on this device.
      </small>
    </div>
  );
}
