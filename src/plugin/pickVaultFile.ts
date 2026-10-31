import { FuzzySuggestModal, type App, type TFile } from "obsidian";

export interface VaultFile {
  path: string;
  text: string;
}

class VaultFileModal extends FuzzySuggestModal<TFile> {
  private chosen: TFile | null = null;

  constructor(
    app: App,
    private extensions: string[],
    private onDone: (file: TFile | null) => void,
  ) {
    super(app);
    this.setPlaceholder(
      `Choose a ${extensions.map((e) => `.${e}`).join(" or ")} file in the vault`,
    );
  }

  getItems(): TFile[] {
    return this.app.vault
      .getFiles()
      .filter((file) => this.extensions.includes(file.extension.toLowerCase()));
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.chosen = file;
  }

  onClose(): void {
    // Obsidian calls onChooseItem after onClose, so resolve on the next turn.
    setTimeout(() => this.onDone(this.chosen), 0);
  }
}

/** Lets the user pick a file already in the vault, for when the system file dialog is unavailable. */
export function pickVaultFile(app: App, extensions: string[]): Promise<VaultFile | null> {
  return new Promise((resolve, reject) => {
    new VaultFileModal(app, extensions, (file) => {
      if (!file) {
        resolve(null);
        return;
      }
      app.vault.read(file).then((text) => resolve({ path: file.path, text }), reject);
    }).open();
  });
}
