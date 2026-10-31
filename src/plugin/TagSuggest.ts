import type { App } from "obsidian";
import { cleanTag } from "@/lib/timer/suggestions";
import { ListSuggest } from "@/plugin/ListSuggest";

const MAX_SUGGESTIONS = 12;

/** Type-ahead over a fixed list of tags, shown without the # prefix. */
export class TagSuggest extends ListSuggest {
  constructor(
    app: App,
    inputEl: HTMLInputElement,
    private tags: string[],
  ) {
    super(app, inputEl);
  }

  protected getSuggestions(query: string): string[] {
    const needle = cleanTag(query).toLowerCase();
    return this.tags.filter((tag) => tag.toLowerCase().includes(needle)).slice(0, MAX_SUGGESTIONS);
  }
}
