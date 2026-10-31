import { Modal, Setting, type App } from "obsidian";
import { CROPS, isCropId } from "@/lib/crops/catalog";
import type { ForestMapping, ForestPreview } from "@/lib/import/forest";
import { TagSuggest } from "@/plugin/TagSuggest";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;
const day = (time: number) =>
  new Date(time).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

class ForestImportModal extends Modal {
  private chosen = false;

  constructor(
    app: App,
    private preview: ForestPreview,
    private mapping: ForestMapping,
    private knownTags: string[],
    private onDecision: (mapping: ForestMapping | null) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    const { preview } = this;
    this.setTitle("Import from Forest");
    let summary = `${plural(preview.successful, "finished session")}`;
    if (preview.first !== null && preview.last !== null)
      summary += `, from ${day(preview.first)} to ${day(preview.last)}`;
    summary += ".";
    if (preview.failed > 0)
      summary += ` ${plural(preview.failed, "withered tree")} will be skipped, as stopped sessions earn nothing.`;
    this.contentEl.createEl("p", { text: summary });

    if (preview.tags.length > 0) {
      new Setting(this.contentEl).setName("Tags").setHeading();
      for (const { name, count } of preview.tags) {
        new Setting(this.contentEl)
          .setName(name)
          .setDesc(`${plural(count, "session")}. Leave empty for no tag.`)
          .addText((control) => {
            control.setPlaceholder("No tag").setValue(this.mapping.tags[name] ?? "");
            new TagSuggest(this.app, control.inputEl, this.knownTags);
            control.onChange((value) => {
              this.mapping.tags[name] = value;
            });
          });
      }
    }

    new Setting(this.contentEl).setName("Trees").setHeading();
    const crops = Object.fromEntries(
      Object.entries(CROPS).map(([id, crop]) => [id, `${crop.emoji} ${crop.name}`]),
    );
    for (const { name, count } of preview.trees) {
      new Setting(this.contentEl)
        .setName(name)
        .setDesc(`${plural(count, "session")}. Which plant should it become?`)
        .addDropdown((control) => {
          control.addOptions(crops).setValue(this.mapping.trees[name]);
          control.onChange((value) => {
            if (isCropId(value)) this.mapping.trees[name] = value;
          });
        });
    }

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Cancel").onClick(this.cancel))
      .addButton((button) =>
        button
          .setButtonText(`Import ${plural(preview.successful, "session")}`)
          .setCta()
          .onClick(this.confirm),
      );
  }

  onClose(): void {
    this.contentEl.empty();
    this.onDecision(this.chosen ? this.mapping : null);
  }

  private cancel = () => this.close();
  private confirm = () => {
    this.chosen = true;
    this.close();
  };
}

/** Asks which Obsidian tag and which plant each Forest tag and tree should become. */
export function askForestMapping(
  app: App,
  preview: ForestPreview,
  suggested: ForestMapping,
  knownTags: string[],
): Promise<ForestMapping | null> {
  const mapping: ForestMapping = { tags: { ...suggested.tags }, trees: { ...suggested.trees } };
  return new Promise((resolve) =>
    new ForestImportModal(app, preview, mapping, knownTags, resolve).open(),
  );
}
