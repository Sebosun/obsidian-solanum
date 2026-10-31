import type { Screen } from "../../types/host";

interface ViewTabsProps {
  screen: Screen;
  onNavigate(screen: Screen): void;
}

export function ViewTabs({ screen, onNavigate }: ViewTabsProps) {
  function openTimer() {
    onNavigate("timer");
  }
  function openHarvest() {
    onNavigate("harvest");
  }
  return (
    <nav className="solanum-tabs" aria-label="Solanum views">
      <button aria-current={screen === "timer" ? "page" : undefined} onClick={openTimer}>
        Timer
      </button>
      <button aria-current={screen === "harvest" ? "page" : undefined} onClick={openHarvest}>
        Harvest
      </button>
    </nav>
  );
}
