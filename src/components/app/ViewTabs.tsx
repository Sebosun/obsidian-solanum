import type { Screen } from "../../types/host";

export function ViewTabs({
  screen,
  onNavigate,
}: {
  screen: Screen;
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <nav className="solanum-tabs" aria-label="Solanum views">
      <button
        aria-current={screen === "timer" ? "page" : undefined}
        onClick={() => onNavigate("timer")}
      >
        Timer
      </button>
      <button
        aria-current={screen === "harvest" ? "page" : undefined}
        onClick={() => onNavigate("harvest")}
      >
        Harvest
      </button>
    </nav>
  );
}
