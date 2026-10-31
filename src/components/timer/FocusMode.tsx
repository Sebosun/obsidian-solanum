import { CropScene } from "../crops/CropScene";
import type { SolanumHost } from "../../types/host";
import type { Revision } from "../../lib/timer/types";

export function FocusMode({
  session,
  host,
  onReveal,
}: {
  session: Revision;
  host: SolanumHost;
  onReveal: () => void;
}) {
  const remaining = host.timer.remaining(session);
  return (
    <main className="solanum-app solanum-focus-mode" aria-label="Focus mode">
      <CropScene
        crop={session.crop}
        progress={1 - remaining / session.durationMs}
        running
        assetUrl={host.assetUrl}
        immersive
        remaining={remaining}
      />
      <button
        className="solanum-reveal-controls"
        aria-label="Show timer controls"
        title="Show controls (Escape)"
        onClick={onReveal}
      >
        •••
      </button>
    </main>
  );
}
