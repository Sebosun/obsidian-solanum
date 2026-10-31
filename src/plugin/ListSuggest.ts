import { AbstractInputSuggest, type App } from "obsidian";

/** Type-ahead over a list of strings: each one is shown as it is, and picking fills the input. */
export abstract class ListSuggest extends AbstractInputSuggest<string> {
  constructor(
    app: App,
    private inputEl: HTMLInputElement,
  ) {
    super(app, inputEl);
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.setText(value);
  }

  selectSuggestion(value: string): void {
    this.setValue(value);
    // Programmatic value changes do not fire the input event the setting listens to.
    this.inputEl.dispatchEvent(new Event("input"));
    this.close();
  }
}
