import { AlgoMccCreate, ChainType, IBlock, ITransaction, Managed, MCC, ReadRpcInterface, retry, RPCInterface, UtxoMccCreate, XrpMccCreate } from "@flarenetwork/mcc";
import { criticalAsync } from "../indexer/indexer-utils";
import { logException } from "../utils/logger";
import { Queue } from "../utils/Queue";

export interface CachedMccClientOptions {
  transactionCacheSize: number;
  blockCacheSize: number;
  cleanupChunkSize: number;
  // maximum number of requests that are either in processing or in queue
  activeLimit: number;
  clientConfig: AlgoMccCreate | UtxoMccCreate | XrpMccCreate;
}

let defaultCachedMccClientOptions: CachedMccClientOptions = {
  transactionCacheSize: 100000,
  blockCacheSize: 100000,
  cleanupChunkSize: 100,
  activeLimit: 50,
  clientConfig: {} as any,
};

// Usage:
// 1) External service should initialize relevant MCC client through CachedMccClient wrapper class
// 2) Services should use the following call sequence
//   (a) try calling `getTransactionFromCache` or `getBlockFromCache`
//   (b) if response is null, then check `canAccept`.
//        (i) If `true` is returned, call `getTransaction` (`getBlock`)
//        (ii) if `false` is returned, sleep for a while and retry `canAccept`. Repeat this until `true` is
//             eventually returned and then proceed with (i)

@Managed()
export class CachedMccClient {
  client: ReadRpcInterface;
  chainType: ChainType;

  transactionCache: Map<string, Promise<ITransaction>>;
  transactionCleanupQueue: Queue<string>;

  blockCache: Map<string | number, Promise<IBlock>>;
  blockCleanupQueue: Queue<string>;

  settings: CachedMccClientOptions;

  // counters
  inProcessing = 0;
  inQueue = 0;
  reqsPs = 0;
  retriesPs = 0;

  cleanupCheckCounter = 0;

  constructor(chainType: ChainType, options?: CachedMccClientOptions, forcedClient?: ReadRpcInterface) {
    this.chainType = chainType;
    this.transactionCache = new Map<string, Promise<ITransaction>>();
    this.transactionCleanupQueue = new Queue<string>();
    this.blockCache = new Map<string, Promise<IBlock>>();
    this.blockCleanupQueue = new Queue<string>();

    this.settings = options || defaultCachedMccClientOptions;

    // Override onSend
    this.settings.clientConfig.rateLimitOptions = {
      ...this.settings.clientConfig.rateLimitOptions,
      onSend: this.onChange.bind(this),
      onResponse: this.onChange.bind(this),
      onPush: this.onChange.bind(this),
      onRpsSample: this.onChange.bind(this),
    };

    if (forcedClient) {
      this.client = forcedClient;
    } else {
      this.client = MCC.Client(this.chainType, this.settings.clientConfig) as any as ReadRpcInterface;
    }
  }

  private onChange(inProcessing?: number, inQueue?: number, reqsPs?: number, retriesPs?: number) {
    this.inProcessing = inProcessing;
    this.inQueue = inQueue;
    this.reqsPs = reqsPs;
    this.retriesPs = retriesPs;
  }

  // Returns transaction from cache
  public getTransactionFromCache(txId: string): Promise<ITransaction> | undefined {
    return this.transactionCache.get(txId);
  }

  public async getTransaction(txId: string) {
    let txPromise = this.getTransactionFromCache(txId);
    if (txPromise) {
      return txPromise;
    }

    // if client.getTransaction after retrying fails, the application is terminated (critical error)
    const newPromise = criticalAsync(`CachedMccClient::getTransaction exception: `, () =>
      retry(`CachedMccClient.getTransaction`, async () => {
        return await this.client.getTransaction(txId);
      })
    )

    this.transactionCache.set(txId, newPromise as Promise<ITransaction>);
    this.transactionCleanupQueue.push(txId);
    this.checkAndCleanup();
    return newPromise;
  }

  public async getBlockFromCache(blockHash: string) {
    return this.blockCache.get(blockHash);
  }

  // getBlock is caching by hashes only! by blockNumber queries are always executed
  public async getBlock(blockHashOrNumber: string | number): Promise<IBlock | null> {
    let blockPromise = this.blockCache.get(blockHashOrNumber);
    if (blockPromise) {
      return blockPromise;
    }

    // if client.getBlock after retrying fails, the application is terminated (critical error)
    const newPromise = criticalAsync(`CachedMccClient::getBlock exception: `, () =>
      retry(`CachedMccClient.getBlock`, async () => {
        return await this.client.getBlock(blockHashOrNumber);
      })
    )

    if (typeof blockHashOrNumber === "number") {
      let block = await newPromise;
      if (!block) return null;
      let blockHash = block.blockHash; // TODO
      this.blockCache.set(blockHash, newPromise as Promise<IBlock>);
      this.blockCleanupQueue.push(blockHash);
    } else {
      this.blockCache.set(blockHashOrNumber, newPromise as Promise<IBlock>);
      this.blockCleanupQueue.push(blockHashOrNumber);
    }
    this.checkAndCleanup();
    return newPromise as Promise<IBlock>; // TODO type
  }

  public get canAccept(): boolean {
    return !this.settings.activeLimit || this.inProcessing + this.inQueue <= this.settings.activeLimit;
  }

  private checkAndCleanup() {
    this.cleanupCheckCounter++;
    if (this.cleanupCheckCounter >= this.settings.cleanupChunkSize) {
      this.cleanupCheckCounter = 0;
      setTimeout(() => this.cleanup()); // non-blocking call
    }
  }

  private cleanup() {
    if (this.blockCleanupQueue.size >= this.settings.blockCacheSize + this.settings.cleanupChunkSize) {
      while (this.blockCleanupQueue.size > this.settings.blockCacheSize) {
        this.blockCache.delete(this.blockCleanupQueue.shift());
      }
    }
    if (this.transactionCleanupQueue.size >= this.settings.transactionCacheSize + this.settings.cleanupChunkSize) {
      while (this.transactionCleanupQueue.size > this.settings.transactionCacheSize) {
        this.transactionCache.delete(this.transactionCleanupQueue.shift());
      }
    }
  }
}
