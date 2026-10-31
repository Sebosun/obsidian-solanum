import { isAudioPath } from "@/lib/audio/soundPath";
import { ListSuggest } from "@/plugin/ListSuggest";

const MAX_SUGGESTIONS = 20;

/** Type-ahead over the audio files in the vault. */
export class AudioFileSuggest extends ListSuggest {
  protected getSuggestions(query: string): string[] {
    const needle = query.trim().toLowerCase();
    return this.app.vault
      .getFiles()
      .map((file) => file.path)
      .filter((path) => isAudioPath(path) && path.toLowerCase().includes(needle))
      .sort()
      .slice(0, MAX_SUGGESTIONS);
  }
}
