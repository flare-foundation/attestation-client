import { RPCInterface } from "flare-mcc";

export interface CacherOptions {
   transactionCacheSize: number;
   transactionClearListSize: number;
   
}

let defaultCacherOptions: CacherOptions = {
   transactionCacheSize: 100000,
   transactionClearListSize: 100
}

export class Cacher<T, B> {
   client: RPCInterface;

   transactionCache: Map<string, T>;
   transactionCleanupQueue: string[];

   blockCache: Map<string, B>;
   blockCleanupQueue: string[];

   settings: CacherOptions;

   constructor(client: RPCInterface, options?: CacherOptions) {
      this.client = client;
      this.transactionCache = new Map<string, T>();
      this.transactionCleanupQueue = [];
      this.settings = options || defaultCacherOptions;
   }

   // returns T or null
   public async getTransactionFromCache(txId: string): Promise<T | null> {
      return null;
   }

   public async getTransaction(txId: string) {

   }

   public async getBlockFromCache(blockHash: string | number) {

   }

   public async getBlock(blockHash: string | number) {

   }

   public isQueueFull(): boolean {
      return false;
   }

   private clearTransactions() {

   }
}