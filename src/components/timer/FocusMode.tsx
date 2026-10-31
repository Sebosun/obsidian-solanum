import { CropScene } from "../../CropScene";
import type { SolanumHost } from "../../host";
import type { Revision } from "../../timer";

export function FocusMode({ session, host, onReveal }: { session: Revision; host: SolanumHost; onReveal: () => void }) {
  return <main className="solanum-app solanum-focus-mode" aria-label="Focus mode">
    <CropScene crop={session.crop} progress={1 - host.timer.remaining(session) / session.durationMs} running assetUrl={host.assetUrl} immersive />
    <button className="solanum-reveal-controls" aria-label="Show timer controls" title="Show controls (Escape)" onClick={onReveal}>•••</button>
  </main>;
}
