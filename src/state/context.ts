import { createContext } from "react";
import type { AppStore } from "./types";

export const AppStoreContext = createContext<AppStore | null>(null);
