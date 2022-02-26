import { Queue } from "../utils/Queue";
import { sleepms } from "../utils/utils";
import { CachedMccClient } from "./CachedMccClient";

export interface LimitingProcessorOptions {
   sleepDelayMs?: number;
   activeLimit?: number;
}

/**
 * Represents an async function call that should be executed when the time is due.
 */
export class DelayedExecution {
   func: any;
   resolve: any;
   reject: any;
   tpp: LimitingProcessor;

   constructor(limitingProcessor: LimitingProcessor, func: any, resolve: any, reject: any) {
      this.tpp = limitingProcessor;
      this.func = func;
      this.resolve = resolve;
      this.reject = reject;
   }

   async run() {
      try {
         let res = await this.func();
         this.resolve(res);
      } catch (e) {
         this.reject(e);
      }
   }
}


/**
 * A processor class that allows for a controlled throughput of async calls that use API calls through a cached client.
 * All async calls that should be controlled should be passed through a .call function. To granually control nested 
 * API calls pass the processor to the async calls so that it can .call can be used in nested calls.
 * 
 * 
 */
export class LimitingProcessor {

   static defaultLimitingProcessorOptions = {
      sleepDelayMs: 100,
      activeLimit: 50
   }

   queue = new Queue<DelayedExecution>();
   client: CachedMccClient<any, any>;
   isActive = false;
   settings: LimitingProcessorOptions;
   onChangeCallbackId: number = -1;

   constructor(cachedClient: CachedMccClient<any, any>, options?: LimitingProcessorOptions) {
      this.settings = options || LimitingProcessor.defaultLimitingProcessorOptions;
      this.client = cachedClient;
      this.start()
   }

   counter = 0;
   public async start() {
      this.isActive = true;
      while (this.isActive) {
         if (this.queue.size === 0 || !this.client.canAccept) {
            // console.log("Sleep:", this.client.inProcessing, this.client.inQueue)
            await sleepms(100)
            continue;
         }
         let de = this.queue.shift();
         de.run();
         this.counter++;
         await sleepms(0);
      }
   }

   public stop() {
      this.isActive = false;
   }

   public destroy() {
      this.queue.destroy();
   }

   public debugInfo() {
      console.log(`calls/s: ${this.client.reqsPs.toString().padStart(3)}   retries/s: ${this.client.retriesPs.toString().padStart(3)}   inProcessing: ${this.client.inProcessing.toString().padStart(3)}   inQueue: ${this.client.inQueue.toString().padStart(3)}   canAccept: ${this.client.canAccept.toString().padStart(5)}   queue len: ${this.queue.size.toString().padStart(7)}`);
   }

   delayExecuteCallback(func: any, resolve: any, reject: any, prepend = false) {
      let de = new DelayedExecution(this, func, resolve, reject);
      if (prepend) {
         this.queue.prepend(de);
      } else {
         this.queue.push(de);
      }
   }

   call(func: any, prepend = false) {
      return new Promise((resolve, reject) => {
         this.delayExecuteCallback(
            func,
            resolve,
            reject,
            prepend
         )
      });
   }
}

/*
// How to use (pseudocode)

async function getFullTransaction(id: string, processor: LimitingProcessor) {
   ...
   let tx = await processor.call(() => getTransaction(id))
   let promises = tx.inputs.map(input => processor.call(() => getTransaction(input)));
   let inputTxs = await Promise.all(promises)
   augument(tx, inputTx);
   ...


}

let processor = new LimitingProcessor(cachedClient)

await processor.call(() => getFullTransaction(id, processor))

*/