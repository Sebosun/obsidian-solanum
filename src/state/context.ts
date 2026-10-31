import { createContext } from "react";
import type { AppStore } from "@/state/types";

export const AppStoreContext = createContext<AppStore | null>(null);
