type ScheduledCallBack = () => Promise<void> | void;

export class IntegerTimeScheduler {
  // integer time
  time: number;
  timeQueue: Map<number, ScheduledCallBack[]>;

  scheduleAfter(callback: ScheduledCallBack, after: number) {
    if (after <= 0) {
      throw new Error("Parameter 'after' must be greater than 0");
    }
    let position = this.time + Math.floor(after);
    let entries = this.timeQueue.get(position);
    if (!entries) {
      entries = [];
      this.timeQueue.set(position, entries);
    }
    entries.push(callback);
  }

  get isExecuted(): boolean {
    let entries = this.timeQueue.get(this.time);
    return !entries || entries.length === 0;
  }

  // Optimize for all increments
  async next() {
    let entries = this.timeQueue.get(this.time);
    if (!this.isExecuted) {
      let promises = entries.map((entry) => entry());
      await Promise.all(promises);
    }
    this.timeQueue.set(this.time, undefined);
    this.time++;
  }
}
