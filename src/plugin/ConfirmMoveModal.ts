import { Modal, Setting, type App } from "obsidian";

interface ConfirmMoveLabels {
  title: string;
  button: string;
}

class ConfirmMoveModal extends Modal {
  private confirmed = false;

  constructor(
    app: App,
    private message: string,
    private onDecision: (confirmed: boolean) => void,
    private labels: ConfirmMoveLabels,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle(this.labels.title);
    this.contentEl.createEl("p", { text: this.message });
    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText("Cancel").onClick(this.cancel))
      .addButton((button) =>
        button.setButtonText(this.labels.button).setCta().onClick(this.confirm),
      );
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

export function confirmMove(
  app: App,
  message: string,
  labels: ConfirmMoveLabels = { title: "Move sessions?", button: "Move sessions" },
): Promise<boolean> {
  return new Promise((resolve) => new ConfirmMoveModal(app, message, resolve, labels).open());
}
