import { Setting, type App } from "obsidian";
import type { Settings } from "@/lib/settings";
import type { SettingsServices, SolanumHost } from "@/types/host";

/** What a settings section needs from the tab that hosts it. */
export interface SettingsContext {
  app: App;
  containerEl: HTMLElement;
  host: SolanumHost;
  services: SettingsServices;
  /** Saves a change in order, so quick edits never overwrite each other. */
  save(patch: Partial<Settings>): Promise<void>;
  reportError(error: unknown): void;
  /** Redraws the whole tab, for when one setting changes the options of another. */
  refresh(): void;
}

export function addHeading(context: SettingsContext, name: string): void {
  new Setting(context.containerEl).setName(name).setHeading();
}
