import { useSyncExternalStore } from "react";
import type { Screen, SolanumHost } from "../../types/host";
import { useAction } from "../../hooks/useAction";
import { useFocusMode } from "../../hooks/useFocusMode";
import { DebugPanel } from "../debug/DebugPanel";
import { FocusMode } from "../timer/FocusMode";
import { TimerPanel } from "../timer/TimerPanel";
import { HarvestPanel } from "../harvest/HarvestPanel";
import { SettingsMenu } from "./SettingsMenu";
import { ViewTabs } from "./ViewTabs";
import { ErrorNotice } from "./ErrorNotice";
import { SyncConflicts } from "./SyncConflicts";

export function App({
  host,
  screen,
  initialMonth,
}: {
  host: SolanumHost;
  screen: Screen;
  initialMonth?: Date;
}) {
  const state = useSyncExternalStore(host.timer.subscribe, host.timer.getState);
  const { act, busy, error, clearError } = useAction();
  const focus = useFocusMode(state.sessions, screen, !!error || state.conflicts.length > 0);
  if (focus.immersive && focus.session)
    return <FocusMode session={focus.session} host={host} onReveal={focus.reveal} />;
  return (
    <main className="solanum-app sol:mx-auto sol:max-w-[560px] sol:px-4 sol:pt-5 sol:pb-7 sol:text-(--text-normal)">
      <div className="solanum-toolbar">
        <ViewTabs screen={screen} onNavigate={host.navigate} />
        <SettingsMenu
          onPreferences={host.openSettings}
          onHide={focus.session ? focus.hide : undefined}
        />
      </div>
      {error && <ErrorNotice message={error} onDismiss={clearError} />}
      <SyncConflicts conflicts={state.conflicts} host={host} act={act} busy={busy} />
      {screen === "timer" ? (
        <TimerPanel
          host={host}
          sessions={state.sessions}
          conflicted={state.conflicts.map((c) => c.sessionId)}
          busy={busy}
          act={act}
        />
      ) : (
        <HarvestPanel
          host={host}
          sessions={state.sessions.filter(
            (s) => !state.conflicts.some((c) => c.sessionId === s.sessionId),
          )}
          initialMonth={initialMonth}
        />
      )}
      {host.debug?.config.enabled && <DebugPanel host={host} act={act} busy={busy} />}
    </main>
  );
}
