/** Runs async actions one after another, in the order they were queued. A failure never blocks the next action. */
export class SerialQueue {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(action: () => Promise<T>): Promise<T> {
    const result = this.tail.then(action);
    this.tail = result.catch(() => {});
    return result;
  }
}
