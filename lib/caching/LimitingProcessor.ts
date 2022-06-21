import { IBlock, Managed } from "@flarenetwork/mcc";
import { Indexer } from "../indexer/indexer";
import { getGlobalLogger, logException } from "../utils/logger";
import { Queue } from "../utils/Queue";
import { sleepms } from "../utils/utils";
import { CachedMccClient } from "./CachedMccClient";

export interface LimitingProcessorOptions {
   sleepDelayMs?: number;
   activeLimit?: number;

   timeout?: number;
   retry?: number;
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
         logException( e, `DelayedExecution::run exception`);
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
 @Managed()
 export class LimitingProcessor {

   static defaultLimitingProcessorOptions = {
      sleepDelayMs: 100,
      activeLimit: 50,
      timeout : 15000,
      retry : 10
   }

   queue = new Queue<DelayedExecution>();
   client: CachedMccClient<any, any>;
   isActive = false;
   isCompleted = false;
   settings: LimitingProcessorOptions;
   topLevelJobsCounter = 0;
   topLevelJobsDoneCounter = 0;
   debugLogInterval: NodeJS.Timeout;
   debugLabel = "";
   reportInMs = 1000;

   block: IBlock;

   indexer: Indexer;

   constructor(indexer: Indexer, options?: LimitingProcessorOptions) {
      this.indexer=indexer;
      this.settings = options || LimitingProcessor.defaultLimitingProcessorOptions;
      this.client = indexer.cachedClient;
      this.continue()
   }

   counter = 0;

   public async start(debug = false) {
      this.continue(debug);
   }

   public async continue(debug = false) {
      if( this.isActive || this.isCompleted ) {
         return;
      }

      if (debug) {
         this.debugOn(this.debugLabel, this.reportInMs);
      }
      this.isActive = true;
      while (this.isActive) {
         if (this.queue.size === 0 || !this.client.canAccept) {
            // console.log("Sleep:", this.client.inProcessing, this.client.inQueue)
            await sleepms(100)
            continue;
         }
         let de = this.queue.shift();
         if( de ) {
            de.run();
         }
         else {
            getGlobalLogger().error2( `LimitingProcessor::continue error: de is undefined` );
         }
         this.counter++;
         await sleepms(0);
      }
   }

   public pause() {
      //getGlobalLogger().info( `pause ^W${this.debugLabel}` );
      this.isActive = false;
      this.debugOff();
   }

   public stop() {
      this.pause();
      this.isCompleted = true;
   }

   public destroy() {
      this.queue.destroy();
   }

   public debugInfo() {
      console.log(`${(this.debugLabel ? this.debugLabel : "").padEnd(10)}  calls/s: ${this.client.reqsPs.toString().padStart(3)}   retries/s: ${this.client.retriesPs.toString().padStart(3)}   inProcessing: ${this.client.inProcessing.toString().padStart(3)}   inQueue: ${this.client.inQueue.toString().padStart(3)}   canAccept: ${this.client.canAccept.toString().padStart(5)}   queue len: ${this.queue.size.toString().padStart(7)}   topLevelJobs: ${this.topLevelJobsDoneCounter}/${this.topLevelJobsCounter}`);
   }

   delayExecuteCallback(func: any, resolve: any, reject: any, prepend = false) {
      let de = new DelayedExecution(this, func, resolve, reject);
      if (prepend) {
         this.queue.prepend(de);
      } else {
         this.queue.push(de);
      }
   }

   public call(func: any, prepend = false) {
      return new Promise((resolve, reject) => {
         this.delayExecuteCallback(
            func,
            resolve,
            reject,
            prepend
         )
      });
   }

   public registerTopLevelJob(n = 1) {
      this.topLevelJobsCounter += n;
   }

   public markTopLevelJobDone() {
      this.topLevelJobsDoneCounter += 1;
   }

   public debugOn(label = "", reportInMs = 1000) {
      this.debugLabel = label;
      this.reportInMs = reportInMs;
      this.debugOff();
      this.debugLogInterval = setInterval(() => {
         this.debugInfo();
      }, reportInMs)
   }

   public debugOff() {
      if (this.debugLogInterval !== undefined) {
         clearInterval(this.debugLogInterval);
      }
      this.debugLogInterval = undefined;
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