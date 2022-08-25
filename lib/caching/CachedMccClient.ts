import { AlgoMccCreate, ChainType, IBlock, ITransaction, Managed, MCC, ReadRpcInterface, UtxoMccCreate, XrpMccCreate } from "@flarenetwork/mcc";
import { criticalAsync } from "../indexer/indexer-utils";
import { retry } from "../utils/PromiseTimeout";
import { Queue } from "../utils/Queue";

interface CachedMccClientOptionsFull {
  transactionCacheSize: number;
  blockCacheSize: number;
  cleanupChunkSize: number;
  // maximum number of requests that are either in processing or in queue
  activeLimit: number;
  clientConfig: AlgoMccCreate | UtxoMccCreate | XrpMccCreate;
  forcedClient?: ReadRpcInterface;
}

interface CachedMccClientOptionsTest {
  forcedClient: ReadRpcInterface
}

export type CachedMccClientOptions = CachedMccClientOptionsFull | CachedMccClientOptionsTest;

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

  constructor(chainType: ChainType, options?: CachedMccClientOptions) {
    this.chainType = chainType;
    this.transactionCache = new Map<string, Promise<ITransaction>>();
    this.transactionCleanupQueue = new Queue<string>();
    this.blockCache = new Map<string, Promise<IBlock>>();
    this.blockCleanupQueue = new Queue<string>();

    this.settings = options || defaultCachedMccClientOptions;

    // Override onSend
    let fullSettings = this.settings as CachedMccClientOptionsFull;
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
      this.client = MCC.Client(this.chainType, fullSettings.clientConfig) as any as ReadRpcInterface;
    }
  }

  private onChange(inProcessing?: number, inQueue?: number, reqsPs?: number, retriesPs?: number) {
    this.inProcessing = inProcessing;
    this.inQueue = inQueue;
    this.reqsPs = reqsPs;
    this.retriesPs = retriesPs;
  }

  public async getTransaction(txId: string) {
    let txPromise = this.transactionCache.get(txId)
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
    let fullSettings = this.settings as CachedMccClientOptionsFull;
    return !fullSettings.activeLimit || this.inProcessing + this.inQueue <= fullSettings.activeLimit;
  }

  private checkAndCleanup() {
    let fullSettings = this.settings as CachedMccClientOptionsFull;
    if(!fullSettings.cleanupChunkSize) {
      return;
    }
    this.cleanupCheckCounter++;
    if (this.cleanupCheckCounter >= fullSettings.cleanupChunkSize) {
      this.cleanupCheckCounter = 0;
      setTimeout(() => this.cleanup()); // non-blocking call
    }
  }

  private cleanup() {
    let fullSettings = this.settings as CachedMccClientOptionsFull;
    if(!fullSettings.blockCacheSize) {
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
