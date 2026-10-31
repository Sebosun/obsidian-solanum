import type { Screen } from "@/types/host";
import { useFocusMode } from "@/hooks/useFocusMode";
import { useAppStore, useServices } from "@/state/hooks";
import { DebugPanel } from "@/components/debug/DebugPanel";
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
  const focus = useFocusMode(screen);
  let content = <TimerPanel immersive={focus.immersive} />;
  if (screen === "harvest") content = <HarvestPanel initialMonth={initialMonth} />;
  let className =
    "solanum-app sol:mx-auto sol:max-w-[560px] sol:px-4 sol:pt-3 sol:pb-5 sol:text-(--text-normal)";
  if (focus.immersive) className = "solanum-app solanum-focus-mode";

  return (
    <main className={className}>
      {!focus.immersive && (
        <div className="solanum-toolbar">
          <ViewTabs screen={screen} onNavigate={services.navigate} />
          <div className="solanum-toolbar-actions">
            {focus.onHide && (
              <button
                className="solanum-icon-button"
                aria-label="Enter focus view"
                title="Focus view (Escape)"
                onClick={focus.onHide}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                </svg>
              </button>
            )}
            <SettingsMenu onPreferences={services.openSettings} onHide={focus.onHide} />
          </div>
        </div>
      )}
      {!focus.immersive && error && <ErrorNotice message={error} onDismiss={clearError} />}
      {!focus.immersive && <SyncConflicts />}
      {content}
      {!focus.immersive && services.debug?.config.enabled && <DebugPanel />}
    </main>
  );
}
