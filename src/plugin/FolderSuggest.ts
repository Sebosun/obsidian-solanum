import { TFolder } from "obsidian";
import { ListSuggest } from "@/plugin/ListSuggest";

const MAX_SUGGESTIONS = 20;

/** Type-ahead over the vault's existing, non-hidden folders. */
export class FolderSuggest extends ListSuggest {
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
}
