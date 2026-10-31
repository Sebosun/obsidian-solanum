import type { ReactNode } from "react";
import { AppStoreContext } from "../../state/context";
import type { AppStore } from "../../state/types";

interface AppStoreProviderProps {
  store: AppStore;
  children: ReactNode;
}

export function AppStoreProvider({ store, children }: AppStoreProviderProps) {
  return <AppStoreContext.Provider value={store}>{children}</AppStoreContext.Provider>;
}
