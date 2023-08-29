import { BlockBase, ChainType, Managed, MCC, ReadRpcInterface, TransactionBase, UtxoMccCreate, XrpMccCreate } from "@flarenetwork/mcc";
import { criticalAsync } from "../indexer/indexer-utils";
import { Queue } from "../utils/data-structures/Queue";
import { retry } from "../utils/helpers/promiseTimeout";

/**
 * Interface for setting the capacities for CachedMccClient:
 *
 * transactionCacheSize+cleanupChunkSize is the maximal number of cached transactions
 * blockCacheSize+cleanupChunkSize is the maximal number of cached blocks
 *
 * After each cleanupChunkSize new items has been cached cleanup is initalized and transactionCached and blockCached
 * are reduced to size at most transactionCacheSize, blockCacheSize, respectively.
 */
export interface CachedMccClientOptionsFull {
  transactionCacheSize: number;
  blockCacheSize: number;
  cleanupChunkSize: number;
  activeLimit: number; // maximum number of requests that are either in processing or in queue
  clientConfig: UtxoMccCreate | XrpMccCreate;
  forcedClient?: ReadRpcInterface<any, any, any, any, any>;
}

export interface CachedMccClientOptionsTest {
  forcedClient: ReadRpcInterface<any, any, any, any, any>;
}

export type CachedMccClientOptions = CachedMccClientOptionsFull | CachedMccClientOptionsTest;

// TODO: Do we ever use this ?????
const defaultCachedMccClientOptions: CachedMccClientOptions = {
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
  client: ReadRpcInterface<any, any, any, any, any>;
  chainType: ChainType;

  transactionCache: Map<string, Promise<TransactionBase<any>>>;
  transactionCleanupQueue: Queue<string>;

  blockCache: Map<string | number, Promise<BlockBase>>;
  blockCleanupQueue: Queue<string>;

  settings: CachedMccClientOptions;

  // counters
  inProcessing = 0;
  inQueue = 0;
  reqsPs = 0;
  retriesPs = 0;

  cleanupCheckCounter = 0;

  constructor(chainType: ChainType, options?: CachedMccClientOptions) {
    this.chainType = chainType;
    this.transactionCache = new Map<string, Promise<TransactionBase<any>>>();
    this.transactionCleanupQueue = new Queue<string>();
    this.blockCache = new Map<string, Promise<BlockBase>>();
    this.blockCleanupQueue = new Queue<string>();

    this.settings = options || defaultCachedMccClientOptions;

    // Override onSend
    const fullSettings = this.settings as CachedMccClientOptionsFull;
    if (fullSettings.clientConfig) {
      fullSettings.clientConfig.rateLimitOptions = {
        ...fullSettings.clientConfig.rateLimitOptions,
        onSend: this.onChange.bind(this),
        onResponse: this.onChange.bind(this),
        onPush: this.onChange.bind(this),
        onRpsSample: this.onChange.bind(this),
      };
    }

    if (options?.forcedClient) {
      this.client = options.forcedClient;
    } else {
      this.client = MCC.Client(this.chainType, fullSettings.clientConfig) as any as ReadRpcInterface<any, any, any, any, any>;
    }
  }

  private onChange(inProcessing?: number, inQueue?: number, reqsPs?: number, retriesPs?: number) {
    this.inProcessing = inProcessing;
    this.inQueue = inQueue;
    this.reqsPs = reqsPs;
    this.retriesPs = retriesPs;
  }

  public async getTransaction(txId: string) {
    const txPromise = this.transactionCache.get(txId);
    if (txPromise) {
      return txPromise;
    }

    // if client.getTransaction after retrying fails, the application is terminated (critical error)
    // eslint-disable-next-line
    const newPromise = criticalAsync(`CachedMccClient::getTransaction(${txId}) exception: `, () =>
      retry(`CachedMccClient.getTransaction(${txId})`, async () => {
        return await this.client.getTransaction(txId);
      })
    );

    this.transactionCache.set(txId, newPromise as Promise<TransactionBase<any>>);
    this.transactionCleanupQueue.push(txId);
    this.checkAndCleanup();
    return newPromise;
  }

  public async getBlockFromCache(blockHash: string) {
    return this.blockCache.get(blockHash);
  }

  /**
   * @dev getBlock is caching by hashes only! by blockNumber queries are always executed
   * @param blockHashOrNumber block hash or block number
   * @returns
   */
  public async getBlock(blockHashOrNumber: string | number): Promise<BlockBase | null> {
    const blockPromise = this.blockCache.get(blockHashOrNumber);
    if (blockPromise) {
      return blockPromise;
    }

    // if client.getBlock after retrying fails, the application is terminated (critical error)
    // eslint-disable-next-line
    const newPromise = criticalAsync(`CachedMccClient::getBlock(${blockHashOrNumber}) exception: `, () =>
      retry(`CachedMccClient.getBlock`, async () => {
        return await this.client.getBlock(blockHashOrNumber);
      })
    );

    if (typeof blockHashOrNumber === "number") {
      const block = await newPromise;
      if (!block) return null;
      const blockHash = block.blockHash;
      this.blockCache.set(blockHash, newPromise as Promise<BlockBase>);
      this.blockCleanupQueue.push(blockHash);
    } else {
      this.blockCache.set(blockHashOrNumber, newPromise as Promise<BlockBase>);
      this.blockCleanupQueue.push(blockHashOrNumber);
    }
    this.checkAndCleanup();
    return newPromise as Promise<BlockBase>;
  }

  public get canAccept(): boolean {
    const fullSettings = this.settings as CachedMccClientOptionsFull;
    return !fullSettings.activeLimit || this.inProcessing + this.inQueue <= fullSettings.activeLimit;
  }

  private checkAndCleanup() {
    const fullSettings = this.settings as CachedMccClientOptionsFull;
    if (!fullSettings.cleanupChunkSize) {
      return;
    }
    this.cleanupCheckCounter++;
    if (this.cleanupCheckCounter >= fullSettings.cleanupChunkSize) {
      this.cleanupCheckCounter = 0;
      setTimeout(() => this.cleanup()); // non-blocking call
    }
  }

  private cleanup() {
    const fullSettings = this.settings as CachedMccClientOptionsFull;
    if (!fullSettings.blockCacheSize) {
      return;
    }
    if (this.blockCleanupQueue.size >= fullSettings.blockCacheSize + fullSettings.cleanupChunkSize) {
      while (this.blockCleanupQueue.size > fullSettings.blockCacheSize) {
        this.blockCache.delete(this.blockCleanupQueue.shift());
      }
    }
    if (this.transactionCleanupQueue.size >= fullSettings.transactionCacheSize + fullSettings.cleanupChunkSize) {
      while (this.transactionCleanupQueue.size > fullSettings.transactionCacheSize) {
        this.transactionCache.delete(this.transactionCleanupQueue.shift());
      }
    }
  }
}
