import { AbstractInputSuggest, type App } from "obsidian";

const MAX_SUGGESTIONS = 12;

/** Type-ahead over a fixed list of tags, shown without the # prefix. */
export class TagSuggest extends AbstractInputSuggest<string> {
  constructor(
    app: App,
    private inputEl: HTMLInputElement,
    private tags: string[],
  ) {
    super(app, inputEl);
  }

  protected getSuggestions(query: string): string[] {
    const needle = query.trim().replace(/^#+/, "").toLowerCase();
    return this.tags.filter((tag) => tag.toLowerCase().includes(needle)).slice(0, MAX_SUGGESTIONS);
  }

  renderSuggestion(tag: string, el: HTMLElement): void {
    el.setText(tag);
  }

  selectSuggestion(tag: string): void {
    this.setValue(tag);
    this.inputEl.dispatchEvent(new Event("input"));
    this.close();
  }
}
