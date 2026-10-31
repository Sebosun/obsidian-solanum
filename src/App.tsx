import { useEffect, useState, useSyncExternalStore } from "react";
import { CropScene } from "./CropScene";
import { PRESETS, type SolanumHost } from "./host";
import { isActive, normalizeTags, type Revision } from "./timer";
import { HarvestPanel } from "./components/harvest/HarvestPanel";
import { DebugPanel } from "./components/debug/DebugPanel";
import { FocusMode } from "./components/timer/FocusMode";
import { CropPicker } from "./components/crops/CropPicker";
import type { CropId } from "./lib/crops/catalog";

const formatTime = (ms: number) => {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
};

export function App({ host, screen, initialMonth }: { host: SolanumHost; screen: "timer" | "harvest"; initialMonth?: Date }) {
  const state = useSyncExternalStore(host.timer.subscribe, host.timer.getState);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const focusing = screen === "timer" ? state.sessions.find((s) => s.phase === "focus" && s.status === "running") : undefined;
  const immersive = focusing && revealed !== focusing.id && !error && !state.conflicts.length;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && focusing) setRevealed(focusing.id); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusing]);
  const act = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  if (immersive) return <FocusMode session={focusing} host={host} onReveal={() => setRevealed(focusing.id)} />;
  return <main className="solanum-app sol:mx-auto sol:max-w-[560px] sol:px-4 sol:pt-5 sol:pb-7 sol:text-(--text-normal)">
    <header className="solanum-header sol:flex sol:items-center sol:justify-between sol:mb-[18px]"><div><span className="solanum-eyebrow">A LITTLE EVERY DAY</span><h1>Solanum <span aria-hidden="true">🍅</span></h1></div>{focusing && <button onClick={() => setRevealed(null)}>Hide timer controls</button>}</header>
    <nav className="solanum-tabs" aria-label="Solanum views">
      <button aria-current={screen === "timer" ? "page" : undefined} onClick={() => host.navigate("timer")}>Timer</button>
      <button aria-current={screen === "harvest" ? "page" : undefined} onClick={() => host.navigate("harvest")}>Harvest</button>
    </nav>
    {error && <div role="alert" className="solanum-error">{error}<button onClick={() => setError("")} aria-label="Dismiss error">×</button></div>}
    {state.conflicts.map((conflict) => <section key={conflict.sessionId} className="solanum-warning">
      <strong>Sync conflict — choose a version</strong><p>Both edits are preserved. This crop is paused for reconciliation.</p>
      {conflict.versions.map((s) => <button disabled={busy} key={s.id} onClick={() => void act(() => host.timer.resolve(s.sessionId, s.id))}>
        Keep {s.phase} / {s.status} · {new Date(s.updatedAt).toLocaleString()} · {s.id.slice(0, 8)}
      </button>)}
    </section>)}
    {screen === "timer" ? <TimerPanel host={host} sessions={state.sessions} conflicted={state.conflicts.map((c) => c.sessionId)} busy={busy} act={act} />
      : <HarvestPanel host={host} sessions={state.sessions.filter((s) => !state.conflicts.some((c) => c.sessionId === s.sessionId))} initialMonth={initialMonth} />}
    {host.debug?.config.enabled && <DebugPanel host={host} act={act} busy={busy} />}
  </main>;
}

type Action = (action: () => Promise<unknown>) => Promise<void>;

function TimerPanel({ host, sessions, conflicted, busy, act }: {
  host: SolanumHost; sessions: Revision[]; conflicted: string[]; busy: boolean; act: Action;
}) {
  const [minutes, setMinutes] = useState(host.settings.defaultMinutes);
  const [crop, setCrop] = useState<CropId>("tomato");
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const active = sessions.filter(isActive);
  const session = active.find((s) => s.sessionId === selected) ?? active[0];
  const last = sessions.find((s) => s.focusEndedAt !== null);
  const remaining = session ? host.timer.remaining(session) : minutes * 60_000;
  const progress = session ? session.phase === "focus" ? 1 - remaining / session.durationMs : 1 : last ? 1 : 0;
  const blocked = busy || (!!session && conflicted.includes(session.sessionId));
  const allTags = [...new Set([...host.tags(), ...sessions.flatMap((s) => s.tags)])].sort();
  return <>
    {active.length > 1 && <label className="solanum-warning">Multiple offline crops are active. Choose one to manage; finish or cancel the others.
      <select aria-label="Active crop" value={session?.sessionId} onChange={(e) => setSelected(e.target.value)}>
        {active.map((s) => <option key={s.sessionId} value={s.sessionId}>{new Date(s.startedAt).toLocaleString()} · {s.notePath ?? "Unlinked crop"}</option>)}
      </select>
    </label>}
    <CropScene crop={session?.crop ?? crop} progress={Math.max(0, Math.min(1, progress))} running={session?.status === "running"} assetUrl={host.assetUrl} />
    <section className="solanum-clock sol:text-center sol:pt-[23px] sol:pb-3.5">
      <span className="solanum-eyebrow">{session ? session.phase === "break" ? "REST & REPLENISH" : session.status === "paused" ? "GROWTH PAUSED" : "TIME TO GROW" : "READY WHEN YOU ARE"}</span>
      <div role="timer" aria-label="Remaining time" className="solanum-countdown sol:text-[clamp(40px,15cqi,64px)] sol:font-light sol:leading-[1.2] sol:tracking-[-3px] sol:tabular-nums sol:mt-2">{formatTime(remaining)}</div>
      <p>{session?.phase === "break" ? "Your crop is grown. Give yourself a little rest." : "One task. A little space. Something good grows."}</p>
    </section>
    {session ? <>
      <div className="solanum-session-context sol:flex sol:flex-wrap sol:gap-1.5 sol:items-center sol:justify-center sol:mb-3">{session.tags.map((t) => <span className="solanum-tag" key={t}>#{t}</span>)}
        {session.notePath && <button className="solanum-note-link" onClick={() => host.openNote(session.notePath!)}>{session.notePath}</button>}
      </div>
      <div className="solanum-actions">
        {session.status === "running" && <button className="mod-cta" disabled={blocked} onClick={() => void act(() => host.timer.pause(session.sessionId))}>Pause</button>}
        {session.status === "paused" && <button className="mod-cta" disabled={blocked} onClick={() => { host.unlockAudio(); void act(() => host.timer.resume(session.sessionId)); }}>Resume</button>}
        {session.status === "waiting" && <button className="mod-cta" disabled={blocked} onClick={() => { host.unlockAudio(); void act(() => host.timer.startBreak(session.sessionId)); }}>Start break</button>}
        <button disabled={blocked} onClick={() => void act(() => host.timer.cancel(session.sessionId))}>{session.phase === "break" ? "Skip break" : "End focus"}</button>
      </div>
      <p className="solanum-hint">Saved in your vault. Closing Obsidian won’t stop this crop.</p>
    </> : <>
      <div className="solanum-presets sol:flex sol:flex-wrap sol:justify-center sol:gap-1.5 sol:mb-[22px]" aria-label="Focus duration">{PRESETS.map((preset) => <button key={preset} aria-pressed={minutes === preset} onClick={() => setMinutes(preset)}>{preset} min</button>)}</div>
      <CropPicker value={crop} onChange={setCrop} />
      <label className="solanum-field">Tags<input aria-label="Tags" list="solanum-tags" placeholder="#work, #study" value={tags} onChange={(e) => setTags(e.target.value)} /></label>
      <datalist id="solanum-tags">{allTags.map((t) => <option key={t} value={`#${t}`} />)}</datalist>
      <label className="solanum-field">Linked note<input aria-label="Linked note" list="solanum-notes" placeholder="Choose a note (optional)" value={note} onChange={(e) => setNote(e.target.value)} /></label>
      <datalist id="solanum-notes">{host.notes().map((p) => <option key={p} value={p} />)}</datalist>
      <button className="solanum-subtle" onClick={() => setNote(host.activeNote() ?? "")}>Use active note</button>
      <button className="mod-cta solanum-start" disabled={busy || conflicted.length > 0} onClick={() => {
        host.unlockAudio();
        void act(async () => {
          if (note && !host.notes().includes(note)) throw new Error("Choose an existing note from this vault.");
          await host.timer.start({ crop, durationMs: minutes * 60_000, breakMs: host.settings.breakMinutes * 60_000, autoBreak: host.settings.autoBreak,
            tags: normalizeTags(tags.split(/[\s,]+/)), notePath: note || null });
        });
      }}>Start focus</button>
    </>}
    <details className="solanum-settings"><summary>Timer preferences</summary><Preferences host={host} act={act} busy={busy} /></details>
  </>;
}

function Preferences({ host, act, busy }: { host: SolanumHost; act: Action; busy: boolean }) {
  const [draft, setDraft] = useState({ ...host.settings });
  return <div className="solanum-preferences sol:flex sol:flex-col sol:gap-2.5 sol:pt-[18px]">
    <label className="solanum-field">Default focus<select value={draft.defaultMinutes} onChange={(e) => setDraft({ ...draft, defaultMinutes: Number(e.target.value) })}>{PRESETS.map((n) => <option key={n} value={n}>{n} min</option>)}</select></label>
    <label className="solanum-field">Break minutes<input type="number" min="1" max="1440" value={draft.breakMinutes} onChange={(e) => setDraft({ ...draft, breakMinutes: Number(e.target.value) })} /></label>
    <div className="solanum-actions">{[5, 20].map((n) => <button key={n} onClick={() => setDraft({ ...draft, breakMinutes: n })}>{n} min break</button>)}</div>
    <label><input type="checkbox" checked={draft.autoBreak} onChange={(e) => setDraft({ ...draft, autoBreak: e.target.checked })} /> Start breaks automatically</label>
    <label><input type="checkbox" checked={draft.sound} onChange={(e) => setDraft({ ...draft, sound: e.target.checked })} /> Completion sound</label>
    <label className="solanum-field">Volume<input type="range" min="0" max="1" step=".05" value={draft.volume} onChange={(e) => setDraft({ ...draft, volume: Number(e.target.value) })} /></label>
    <div className="solanum-actions"><button disabled={busy} onClick={() => void act(async () => {
      if (!Number.isFinite(draft.breakMinutes) || draft.breakMinutes < 1 || draft.breakMinutes > 1440) throw new Error("Break must be between 1 and 1440 minutes.");
      await host.saveSettings(draft);
    })}>Save preferences</button><button onClick={() => host.previewSound()}>Test sound</button></div>
    <small>Changes apply to new sessions. Sync the Solanum folder to carry crops between devices. Audio needs Obsidian open and may need a tap on this device.</small>
  </div>;
}
