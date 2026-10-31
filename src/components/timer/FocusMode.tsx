import { CropScene } from "../crops/CropScene";
import { useAppStore, useServices } from "../../state/hooks";
import { selectCurrentSession } from "../../state/selectors";

export function FocusMode() {
  const services = useServices();
  const session = useAppStore(selectCurrentSession);
  const reveal = useAppStore((state) => state.revealControls);
  if (!session) return null;
  const remaining = services.timer.remaining(session);
  function revealControls() {
    if (session) reveal(session.id);
  }
  return (
    <main className="solanum-app solanum-focus-mode" aria-label="Focus mode">
      <CropScene
        crop={session.crop}
        progress={1 - remaining / session.durationMs}
        running
        remaining={remaining}
        immersive
      />
      <button
        className="solanum-reveal-controls"
        aria-label="Show timer controls"
        title="Show controls (Escape)"
        onClick={revealControls}
      >
        •••
      </button>
    </main>
  );
}
