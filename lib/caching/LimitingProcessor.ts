import { IBlock, Managed } from "@flarenetwork/mcc";
import { onSaveSig } from "../indexer/chain-collector-helpers/types";
import { Indexer } from "../indexer/indexer";
import { criticalAsync } from "../indexer/indexer-utils";
import { getGlobalLogger, logException } from "../utils/logger";
import { Queue } from "../utils/Queue";
import { sleepms } from "../utils/utils";
import { CachedMccClient } from "./CachedMccClient";


/**
 * Limiting processor is a pauseable scheduler of async function calls. It is mainly
 * used for processing transactions in a block. For example, given a block, 
 * one may need to asynchronous process all the transactions in a block, where processing each 
 * transaction may require making additional async calls. For example for an UTXO transaction, 
 * we may want to read all the input transactions. A limiting processor instance is used to process
 * a single block. This triggers processing of the block transactions in the sequence, which are considered
 * as the top level jobs. Each transaction processing triggers further processing of the input transactions
 * as sub-jobs. While top level jobs (block transactions) are processed in the sequence (using queue),  
 * second level jobs (input transactions) are injected to the beginning of the queue thus implying that
 * start of processing of the next top level job has lower priority then the start of sub-jobs of 
 * previous top level jobs.
 * 
 * Such a processing can be paused at any time. Note that limiting processor is supposed to work with 
 * cached client, which actually fetches and caches responses for the transaction data from API nodes. 
 * In addition the cached client maintains a queue of scheduled calls, which are in processing or are to 
 * be processed. Since the client is rate-limited, limiting processor pushes the jobs (API calls) to the client 
 * in a controlled manner, taking care that there are not too many jobs in that queue, roughly just for 
 * the next 1 second. In such a way, when the limiting processor is paused, the jobs that are still 
 * in processing clear out in about 1 second. By pausing a limiting processor, we essentially 
 * temporarily stop processing a blok on a certain transaction. Processing can be resumed later at 
 * the point of stopping. Once all the transactions (top-level) jobs are completed, the processing of
 * the limiting processor class is done and results can be extracted and used elsewhere.
 * 
 * Such a functionality is important in managing the priority of block processing on chains that 
 * have several forks. The priority is always the main fork, but as it switches on a node, 
 * we pause limiting block processor and resume/initialize a limiting processor on the block 
 * of the same height on the other fork that became main now. 
 * This happens for every switch. Since transaction calls are cached by 
 * caching client and since the blocks on the same height are likely to contain a large number of 
 * same transactions, caching helps in preventing unnecessary API calls.
 * 
 *
 */
export interface LimitingProcessorOptions {
  sleepDelayMs?: number;
  activeLimit?: number;

  timeout?: number;
  retry?: number;
}

/**
 * Represents an job in form of an async function to be called when the time is due, together with `resolve`
 * and `reject` callbacks.
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

  /**
   * Starts a job
   */
  async run() {
    try {
      const res = await this.func();
      this.resolve(res);
    } catch (e) {
      logException(e, `DelayedExecution::run exception`);
      this.reject(e);
    }
  }
}

/**
 * A processor class that allows for a controlled throughput of async calls that use API calls through a cached client.
 * All async calls that should be controlled should be passed through a .call function. To granularly control nested
 * API calls, pass the processor to the async calls so that it can .call can be used in nested calls.
 */
@Managed()
export class LimitingProcessor {
  static defaultLimitingProcessorOptions = {
    sleepDelayMs: 100,
    activeLimit: 50,
    timeout: 15000,
    retry: 10,
  };

  queue = new Queue<DelayedExecution>();
  client: CachedMccClient;
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
    this.indexer = indexer;
    this.settings = options || LimitingProcessor.defaultLimitingProcessorOptions;
    this.client = indexer.cachedClient;
    // eslint-disable-next-line
    criticalAsync(`LimitingProcessor::constructor -> LimitingProcessor::continue exception: `, () => this.start());
  }

  counter = 0;

  /**
   * Starts a limiting processor
   * @param debug enables debug mode
   */
  public async start(debug = false) {
    await this.resume(debug);
  }

  /**
   * Resumes the limiting processor
   * @param debug enables debug mode
   * @returns 
   */
  public async resume(debug = false) {
    if (this.isActive || this.isCompleted) {
      return;
    }

    if (debug) {
      this.debugOn(this.debugLabel, this.reportInMs);
    }
    this.isActive = true;
    while (this.isActive) {
      if (this.queue.size === 0 || !this.client.canAccept) {
        // console.log("Sleep:", this.client.inProcessing, this.client.inQueue)
        await sleepms(100);
        continue;
      }
      const de = this.queue.shift();
      if (de) {
        // eslint-disable-next-line
        criticalAsync(`LimitingProcessor::continue -> DelayedExecution::run `, () => de.run());
      } else {
        getGlobalLogger().error2(`LimitingProcessor::continue error: de is undefined`);
      }
      this.counter++;
      await sleepms(0);
    }
  }

  /**
   * Pauses the limiting processor
   */
  public pause() {
    //getGlobalLogger().info( `pause ^W${this.debugLabel}` );
    this.isActive = false;
    this.debugOff();
  }

  /**
   * Stops the limiting processor and declares it completed
   */
  public stop() {
    this.pause();
    this.isCompleted = true;
  }

  /**
   * Clears up the queue of the limiting processor.
   */
  public destroy() {
    this.queue.destroy();
  }

  /**
   * Debug printout
   */
  public debugInfo() {
    console.log(
      `${(this.debugLabel ? this.debugLabel : "").padEnd(10)}  calls/s: ${this.client.reqsPs.toString().padStart(3)}   retries/s: ${this.client.retriesPs
        .toString()
        .padStart(3)}   inProcessing: ${this.client.inProcessing.toString().padStart(3)}   inQueue: ${this.client.inQueue
        .toString()
        .padStart(3)}   canAccept: ${this.client.canAccept.toString().padStart(5)}   queue len: ${this.queue.size.toString().padStart(7)}   topLevelJobs: ${
        this.topLevelJobsDoneCounter
      }/${this.topLevelJobsCounter}`
    );
  }

  /**
   * Wrapper function for job creation
   * @param func async function to be called on job start
   * @param resolve on success callback
   * @param reject on failure callback
   * @param prepend whether the job should be prepended or appended to the queue
   */
  private delayExecuteCallback(func: any, resolve: any, reject: any, prepend = false) {
    const de = new DelayedExecution(this, func, resolve, reject);
    if (prepend) {
      this.queue.prepend(de);
    } else {
      this.queue.push(de);
    }
  }

  /**
   * Call wrapper that packs the job of executing an async function to a promise 
   * @param func async function to be called on job start
   * @param prepend whether the job should be prepended or appended to the queue
   * @returns 
   */
  public call(func: any, prepend = false) {
    return new Promise((resolve, reject) => {
      this.delayExecuteCallback(func, resolve, reject, prepend);
    });
  }

  /**
   * Registers the next top level job(s)
   * Used to keep track of top level jobs from outside.
   * @param n - number of top level jobs to register
   */
  public registerTopLevelJob(n = 1) {
    this.topLevelJobsCounter += n;
  }

  /**
   * Marks the end of a top level job.
   * Used to keep track of top level jobs from outside.
   */
  public markTopLevelJobDone() {
    this.topLevelJobsDoneCounter += 1;
  }

  /**
   * Switches on debug mode
   * @param label debug label used in printouts
   * @param reportInMs period of reporting of the state of the limiting processor
   */
  public debugOn(label = "", reportInMs = 1000) {
    this.debugLabel = label;
    this.reportInMs = reportInMs;
    this.debugOff();
    this.debugLogInterval = setInterval(() => {
      this.debugInfo();
    }, reportInMs);
  }

  /**
   * Switches off the debug mode
   */
  public debugOff() {
    if (this.debugLogInterval !== undefined) {
      clearInterval(this.debugLogInterval);
    }
    this.debugLogInterval = undefined;
  }

  async initializeJobs(block: IBlock, onSave: onSaveSig) {
    throw new Error("Should be shadowed");
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
