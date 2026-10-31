import { Modal, Setting, type App } from "obsidian";

class ConfirmMoveModal extends Modal {
  private confirmed = false;

  constructor(
    app: App,
    private message: string,
    private onDecision: (confirmed: boolean) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Move sessions?");
    this.contentEl.createEl("p", { text: this.message });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Cancel").onClick(this.cancel))
      .addButton((button) => button.setButtonText("Move sessions").setCta().onClick(this.confirm));
  }

  onClose(): void {
    this.contentEl.empty();
    this.onDecision(this.confirmed);
  }

  private cancel = () => this.close();
  private confirm = () => {
    this.confirmed = true;
    this.close();
  };
}

export function confirmMove(app: App, message: string): Promise<boolean> {
  return new Promise((resolve) => new ConfirmMoveModal(app, message, resolve).open());
}
