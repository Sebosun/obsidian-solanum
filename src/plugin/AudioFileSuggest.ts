import { AbstractInputSuggest, type App } from "obsidian";
import { isAudioPath } from "@/lib/audio/soundPath";

const MAX_SUGGESTIONS = 20;

/** Type-ahead over the audio files in the vault. */
export class AudioFileSuggest extends AbstractInputSuggest<string> {
  constructor(
    app: App,
    private inputEl: HTMLInputElement,
  ) {
    super(app, inputEl);
  }

  protected getSuggestions(query: string): string[] {
    const needle = query.trim().toLowerCase();
    return this.app.vault
      .getFiles()
      .map((file) => file.path)
      .filter((path) => isAudioPath(path) && path.toLowerCase().includes(needle))
      .sort()
      .slice(0, MAX_SUGGESTIONS);
  }

  renderSuggestion(path: string, el: HTMLElement): void {
    el.setText(path);
  }

  selectSuggestion(path: string): void {
    this.setValue(path);
    this.inputEl.dispatchEvent(new Event("input"));
    this.close();
  }
}
