import type { Screen } from "@/types/host";
import { useFocusMode } from "@/hooks/useFocusMode";
import { useAppStore, useServices } from "@/state/hooks";
import { DebugPanel } from "@/components/debug/DebugPanel";
import { DebugShortcut } from "@/components/debug/DebugShortcut";
import { TimerPanel } from "@/components/timer/TimerPanel";
import { HarvestPanel } from "@/components/harvest/HarvestPanel";
import { SettingsMenu } from "@/components/app/SettingsMenu";
import { ViewTabs } from "@/components/app/ViewTabs";
import { ErrorNotice } from "@/components/app/ErrorNotice";
import { SyncConflicts } from "@/components/app/SyncConflicts";

interface AppContentProps {
  screen: Screen;
  initialMonth?: Date;
}

export function AppContent({ screen, initialMonth }: AppContentProps) {
  const services = useServices();
  const error = useAppStore((state) => state.error);
  const clearError = useAppStore((state) => state.clearError);
  const immersive = useFocusMode(screen);
  let content = <TimerPanel immersive={immersive} />;
  if (screen === "harvest") content = <HarvestPanel initialMonth={initialMonth} />;
  let className =
    "solanum-app sol:mx-auto sol:max-w-[560px] sol:px-4 sol:pt-3 sol:pb-5 sol:text-(--text-normal)";
  if (immersive) className = "solanum-app solanum-focus-mode";
  // A phase that fills the view hides everything but the scene.
  const chrome = !immersive;
  const debugEnabled = services.debug?.config.enabled;

  return (
    <main className={className}>
      {chrome && (
        <div className="solanum-toolbar">
          <ViewTabs screen={screen} onNavigate={services.navigate} />
          <div className="solanum-toolbar-actions">
            <SettingsMenu onPreferences={services.openSettings} />
          </div>
        </div>
      )}
      {chrome && error && <ErrorNotice message={error} onDismiss={clearError} />}
      {chrome && <SyncConflicts />}
      {content}
      {debugEnabled && (immersive ? <DebugShortcut /> : <DebugPanel />)}
    </main>
  );
}
