import { useContext } from "react";
import { useStore } from "zustand";
import { AppStoreContext } from "@/state/context";
import type { AppState } from "@/state/types";
import type { SolanumHost } from "@/types/host";

export function useAppStore<T>(selector: (state: AppState) => T): T {
  const store = useContext(AppStoreContext);
  if (!store) throw new Error("Solanum components require an application store.");
  return useStore(store, selector);
}

export function useServices(): SolanumHost {
  return useAppStore((state) => state.services);
}
