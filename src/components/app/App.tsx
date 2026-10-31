import type { Screen, SolanumHost } from "../../types/host";
import { getAppStore } from "../../state/appStore";
import { AppStoreProvider } from "./AppStoreProvider";
import { AppContent } from "./AppContent";

interface AppProps {
  host: SolanumHost;
  screen: Screen;
  initialMonth?: Date;
}

/** Only the Obsidian view boundary receives services; feature components use the store. */
export function App({ host, screen, initialMonth }: AppProps) {
  const store = getAppStore(host);
  return (
    <AppStoreProvider store={store}>
      <AppContent screen={screen} initialMonth={initialMonth} />
    </AppStoreProvider>
  );
}
