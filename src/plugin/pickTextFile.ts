/** How long the system picker gets to take focus before we suggest the vault picker instead. */
const PICKER_HINT_DELAY_MS = 1500;

export interface PickTextFileOptions {
  accept?: string;
  /** Called when no system dialog seems to have opened (some Linux setups never show one). */
  onNoDialog?: () => void;
}

/** Opens the system file picker and resolves with the chosen file's text, or null if cancelled. */
export function pickTextFile({
  accept = ".json,application/json",
  onNoDialog,
}: PickTextFileOptions = {}): Promise<string | null> {
  return new Promise((resolve) => {
    const doc = typeof activeDocument === "undefined" ? document : activeDocument;
    const win = doc.defaultView ?? window;
    const input = doc.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.hidden = true;
    // Some browsers ignore click() on an input that is not in the page.
    doc.body.appendChild(input);

    let hint: number | undefined;
    const finish = (text: string | null) => {
      win.clearTimeout(hint);
      win.removeEventListener("blur", onBlur);
      input.remove();
      resolve(text);
    };
    const onBlur = () => win.clearTimeout(hint);

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      file.text().then(finish, () => finish(null));
    });
    input.addEventListener("cancel", () => finish(null));
    win.addEventListener("blur", onBlur);
    if (onNoDialog) hint = win.setTimeout(onNoDialog, PICKER_HINT_DELAY_MS);
    input.click();
  });
}
