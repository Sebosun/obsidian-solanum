import { AbstractInputSuggest, TFolder, type App } from "obsidian";

const MAX_SUGGESTIONS = 20;

/** Type-ahead over the vault's existing, non-hidden folders. */
export class FolderSuggest extends AbstractInputSuggest<string> {
  constructor(
    app: App,
    private inputEl: HTMLInputElement,
  ) {
    super(app, inputEl);
  }

  protected getSuggestions(query: string): string[] {
    const needle = query.trim().toLowerCase();
    return this.app.vault
      .getAllLoadedFiles()
      .filter((file): file is TFolder => file instanceof TFolder)
      .map((folder) => folder.path)
      .filter((path) => path !== "/" && !path.split("/").some((part) => part.startsWith(".")))
      .filter((path) => path.toLowerCase().includes(needle))
      .sort()
      .slice(0, MAX_SUGGESTIONS);
  }

  renderSuggestion(path: string, el: HTMLElement): void {
    el.setText(path);
  }

  selectSuggestion(path: string): void {
    this.setValue(path);
    // Programmatic value changes do not fire the input event the setting listens to.
    this.inputEl.dispatchEvent(new Event("input"));
    this.close();
  }
}
