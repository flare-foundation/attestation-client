import { sleepMs } from "../../utils/helpers/utils";
import { logException } from "../../utils/logging/logger";
import { IIndexedQueryManager } from "../IIndexedQueryManager";

export class RandomDBIterator<T> {
  iqm: IIndexedQueryManager;
  cache: Map<number, T>;
  startIndex = 0;
  endIndex = -1;
  batchSize: number;
  topUpThreshold: number;
  fetch: () => Promise<T[]>;
  label: string;

  constructor(iqm: IIndexedQueryManager, fetch: () => Promise<T[]>, batchSize: number, topUpThreshold = 0.25, label = "default") {
    this.iqm = iqm;
    this.cache = new Map<number, T>();
    this.batchSize = batchSize;
    this.topUpThreshold = topUpThreshold;
    this.fetch = fetch;
    this.label = label;
  }

  public get size() {
    return Math.max(this.endIndex - this.startIndex + 1);
  }

  public async next() {
    try {
      while (this.size <= 0) {
        await this.refresh();
      }
    } catch (error) {
      logException(error, `RandomDBIterator::next`);
    }
    await sleepMs(100);
    if (this.size / this.batchSize < this.topUpThreshold) {
      // eslint-disable-next-line
      this.refresh(); // async call
    }
    const tmp = this.cache.get(this.startIndex);
    this.cache.delete(this.startIndex);
    this.startIndex++;
    return tmp;
  }

  public insert(item: T) {
    this.cache.set(this.endIndex + 1, item);
    this.endIndex++;
  }

  refreshing = false;

  public async initialize() {
    await this.refresh();
  }

  public async refresh() {
    if (this.refreshing) {
      return;
    }
    this.refreshing = true;
    console.time(this.label);
    const items = await this.fetch();
    console.timeEnd(this.label);
    console.log(`${this.label}: ${items.length}`);

    for (const item of items) {
      this.insert(item);
    }
    this.refreshing = false;
  }
}
