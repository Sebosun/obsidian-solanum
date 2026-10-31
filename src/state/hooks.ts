import { useContext } from "react";
import { useStore } from "zustand";
import { AppStoreContext } from "./context";
import type { AppState } from "./types";

export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error("Solanum components require an application store.");
  return useStore(store, selector);
}

export function useServices() {
  return useAppStore((state) => state.services);
}
