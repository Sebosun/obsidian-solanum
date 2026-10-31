import type { Screen } from "../../types/host";
import { useFocusMode } from "../../hooks/useFocusMode";
import { useAppStore, useServices } from "../../state/hooks";
import { DebugPanel } from "../debug/DebugPanel";
import { FocusMode } from "../timer/FocusMode";
import { TimerPanel } from "../timer/TimerPanel";
import { HarvestPanel } from "../harvest/HarvestPanel";
import { SettingsMenu } from "./SettingsMenu";
import { ViewTabs } from "./ViewTabs";
import { ErrorNotice } from "./ErrorNotice";
import { SyncConflicts } from "./SyncConflicts";

interface AppContentProps {
  screen: Screen;
  initialMonth?: Date;
}

export function AppContent({ screen, initialMonth }: AppContentProps) {
  const services = useServices();
  const error = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);
  const focus = useFocusMode(screen);
  if (focus.immersive) return <FocusMode />;

  let content = <TimerPanel />;
  if (screen === "harvest") content = <HarvestPanel initialMonth={initialMonth} />;

  return (
    <main className="solanum-app sol:mx-auto sol:max-w-[560px] sol:px-4 sol:pt-3 sol:pb-5 sol:text-(--text-normal)">
      <div className="solanum-toolbar">
        <ViewTabs screen={screen} onNavigate={services.navigate} />
        <SettingsMenu onPreferences={services.openSettings} onHide={focus.onHide} />
      </div>
      {error && <ErrorNotice message={error} onDismiss={clearError} />}
      <SyncConflicts />
      {content}
      {services.debug?.config.enabled && <DebugPanel />}
    </main>
  );
}
