import { AlgoMccCreate, ChainType, MCC, RPCInterface, UtxoMccCreate, XrpMccCreate } from "flare-mcc";
import { Queue } from "../utils/Queue";

export interface CachedMccClientOptions {
  transactionCacheSize: number;
  blockCacheSize: number;
  cleanupChunkSize: number;
     // maximum number of requests that are either in processing or in queue
  maxInAction: number; 
  clientConfig: AlgoMccCreate | UtxoMccCreate | XrpMccCreate;
}

let defaultCachedMccClientOptions: CachedMccClientOptions = {
  transactionCacheSize: 100000,
  blockCacheSize: 100000,
  cleanupChunkSize: 100,
  maxInAction: 50, 
  clientConfig: {} as any
}

// Usage:
// 1) External service should initialize relevant MCC client through CachedMccClient wrapper class
// 2) Services should use the following call sequence
//   (a) try calling `getTransactionFromCache` or `getBlockFromCache`
//   (b) if response is null, then check `canAccept`. 
//        (i) If `true` is returned, call `getTransaction` (`getBlock`)
//        (ii) if `false` is returned, sleep for a while and retry `canAccept`. Repeat this until `true` is 
//             eventually returned and then proceed with (i)

export class CachedMccClient<T, B> {
  client: RPCInterface;
  chainType: ChainType;

  transactionCache: Map<string, Promise<T>>;
  transactionCleanupQueue: Queue<string>;

  blockCache: Map<string | number, Promise<B>>;
  blockCleanupQueue: Queue<string>;

  settings: CachedMccClientOptions;

  inProcessing = 0;
  inQueue = 0;

  cleanupCheckCounter = 0;

  constructor(chainType: ChainType, options?: CachedMccClientOptions) {
    this.chainType = chainType;
    this.transactionCache = new Map<string, Promise<T>>();
    this.transactionCleanupQueue = new Queue<string>();
    this.blockCache = new Map<string | number, Promise<B>>();
    this.blockCleanupQueue = new Queue<string>();

    this.settings = options || defaultCachedMccClientOptions;

    // Override onSend
    this.settings.clientConfig.rateLimitOptions = {
      ...this.settings.clientConfig.rateLimitOptions,
      onSend: this.onSend.bind(this)
    }

    this.client = MCC.Client(this.chainType, this.settings.clientConfig) as any as RPCInterface // TODO
  }

  private onSend(inProcessing?: number, inQueue?: number) {
    this.inProcessing = inProcessing;
    this.inQueue = inQueue;
  }

  // returns T or null
  public async getTransactionFromCache(txId: string): Promise<T> | null {
    return this.transactionCache.get(txId);
  }

  public async getTransaction(txId: string) {
    // if(!this.canAccept) {
    //   throw Error("Cannot accept transaction requests");
    // }
    let txPromise = this.transactionCache.get(txId);
    if(txPromise) {
      return txPromise;
    }
    let newPromise = this.client.getTransaction(txId);
    this.transactionCache.set(txId, newPromise);
    this.checkAndCleanup();
    return newPromise;    
  }

  public async getBlockFromCache(blockHashOrNumber: string | number) {
    return this.blockCache.get(blockHashOrNumber)
  }

  public async getBlock(blockHashOrNumber: string | number): Promise<B | null> {
    // if(!this.canAccept) {
    //   throw Error("Cannot accept block requests");
    // }
    let blockPromise = this.blockCache.get(blockHashOrNumber);
    if(blockPromise) {
      return blockPromise;
    }
    let newPromise = this.client.getBlock(blockHashOrNumber);
    let resp = (await newPromise) as B;
    if(typeof blockHashOrNumber === "string") {
      let blockNumber = this.client.blockNumber(resp);       // TODO: implement in MCC (extracts block number from response)  
      this.transactionCache.set(blockNumber, newPromise);   
    } else if(typeof blockHashOrNumber === "number") {
      let blockHash = this.client.blockHash(resp);   // TODO: implement in MCC (extracts block hash from block response)
      this.transactionCache.set(blockHash, newPromise);   
    } else {
      return null;
    }
    this.blockCache.set(blockHashOrNumber, newPromise); 
    this.checkAndCleanup();
    return newPromise;    
  }

  public get canAccept(): boolean {
    return !this.settings.maxInAction || this.inProcessing + this.inQueue <= this.settings.maxInAction;
  }

  private checkAndCleanup() {
    this.cleanupCheckCounter++;
    if(this.cleanupCheckCounter >= this.settings.cleanupChunkSize) {
      this.cleanupCheckCounter = 0;
      setTimeout(() => this.cleanup());   // non-blocking call
    }
  }

  private cleanup() {
    if(this.blockCleanupQueue.size >= this.settings.blockCacheSize + this.settings.cleanupChunkSize) {
      while(this.blockCleanupQueue.size > this.settings.blockCacheSize) {
        this.blockCache.delete(this.blockCleanupQueue.shift())
      }  
    }
    if(this.transactionCleanupQueue.size >= this.settings.transactionCacheSize + this.settings.cleanupChunkSize) {
      while(this.transactionCleanupQueue.size > this.settings.transactionCacheSize) {
        this.transactionCache.delete(this.transactionCleanupQueue.shift())
      }
    }
  }

}