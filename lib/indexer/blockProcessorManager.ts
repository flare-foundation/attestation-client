import { IBlock, Managed, sleepMs } from "@flarenetwork/mcc";
import { CachedMccClient } from "../caching/CachedMccClient";
import { LimitingProcessor } from "../caching/LimitingProcessor";
import { AttLogger } from "../utils/logger";
import { failureCallback, retry } from "../utils/PromiseTimeout";
import { BlockProcessor } from "./chain-collector-helpers/blockProcessor";
import { Indexer } from "./indexer";
import { criticalAsync } from "./indexer-utils";

@Managed()
export class BlockProcessorManager {
  indexer: Indexer;

  logger: AttLogger;

  blockProcessors: LimitingProcessor[] = [];

  cachedClient: CachedMccClient<any, any>;

  completeCallback: any;
  alreadyCompleteCallback: any;

  blockCache = new Map<number, IBlock>();
  blockHashCache = new Map<string, IBlock>();

  constructor(indexer: Indexer, logger: AttLogger, client: CachedMccClient<any, any>, completeCallback: any, alreadyCompleteCallback: any) {
    this.indexer = indexer;
    this.logger = logger;
    this.cachedClient = client;
    this.completeCallback = completeCallback;
    this.alreadyCompleteCallback = alreadyCompleteCallback;
  }

  // todo: write this method decorator
  // @terminateAppOnException()
  // always run with noAwaitAsyncTerminateAppOnException(`WhereFrom -> blockProcessorManager::processSyncBlockNumber exception ` , () => this.blockProcessorManager.processSyncBlockNumber(block))
  async processSyncBlockNumber(blockNumber: number) {
    const cachedBlock = await this.blockCache.get(blockNumber);

    if (cachedBlock) return;

    const block = await retry(`BlockProcessorManager.getBlock.processSyncBlockNumber`, async () => {
      return await this.cachedClient.getBlock(blockNumber);
    });

    if (!block) return;

    this.blockCache.set(blockNumber, block);

    criticalAsync(`processSyncBlockNumber -> BlockProcessorManager::process exception: `, () => this.process(block, true));
  }

  // @terminateAppOnException()
  // always run with noAwaitAsyncTerminateAppOnException(`WhereFrom -> blockProcessorManager::processSyncBlockHash exception ` , () => this.blockProcessorManager.processSyncBlockHash(block))
  async processSyncBlockHash(blockHash: string) {
    const cachedBlock = await this.blockHashCache.get(blockHash);

    if (cachedBlock) return;

    const block = await retry(`BlockProcessorManager.getBlock.processSyncBlockHash`, async () => {
      return await this.cachedClient.getBlock(blockHash);
    });

    if (!block) return;

    this.blockHashCache.set(blockHash, block);
    criticalAsync(`processSyncBlockHash -> BlockProcessorManager::process exception: `, () => this.process(block, true));
  }

  // @terminateAppOnException()
  // always call with noAwaitAsyncTerminateAppOnException(`WhereFrom -> BlockProcessorManager::process exception: `, () => this.blockProcessorManager.process(block, syncMode));
  async process(block: IBlock, syncMode = false) {
    let started = false;
    for (let a = 0; a < this.blockProcessors.length; a++) {
      if (this.blockProcessors[a].block.stdBlockHash === block.stdBlockHash) {
        started = true;

        if (syncMode) return;

        if (this.blockProcessors[a].isCompleted) {
          this.logger.info(`^w^Kprocess block ${block.number}^^^W (completed)`);

          criticalAsync(`process -> BlockProcessorManager::alreadyCompleteCallback exception:`, () => this.alreadyCompleteCallback(block));

          return;
        }

        this.logger.info(`^w^Kprocess block ${block.number}^^^W (continue)`);
        criticalAsync(`process -> BlockProcessorManager::blockProcessors.continue exception:`, () => this.blockProcessors[a].continue());
      } else {
        if (!syncMode) {
          this.blockProcessors[a].pause();
        }
      }
    }

    if (started) return;

    if (this.indexer.chainConfig.validateBlockBeforeProcess) {
      let checkCount = 0;
      let block0 = block;
      while (!block0.isValid) {
        if (checkCount++ == 0) {
          this.logger.debug2(`waiting on block ${block.number} to be valid`);
        }

        if (checkCount > this.indexer.chainConfig.validateBlockMaxRetry) {
          failureCallback(`invalid block: block ${block.number} did not become valid in ${checkCount} retires`);
        }

        await sleepMs(this.indexer.chainConfig.validateBlockWaitMs);

        // get block again
        block0 = await this.indexer.cachedClient.client.getBlock(block.number);
      }

      if (checkCount > 0) {
        this.logger.debug(`block ${block.number} is now valid`);
      }

    }

    this.logger.info(`^w^Kprocess block ${block.number}`);

    const processor = new (BlockProcessor(this.cachedClient.chainType))(this.indexer);
    this.blockProcessors.push(processor);

    //processor.debugOn( block.hash );

    // terminate app on exception
    criticalAsync(`process -> BlockProcessorManager::processor.initializeJobs exception:`, () => processor.initializeJobs(block, this.completeCallback));
  }

  clear(fromBlock: number) {
    // delete all that are block number <= completed block number
    let i = 0;
    while (i < this.blockProcessors.length) {
      if (this.blockProcessors[i].block.number <= fromBlock) {
        this.blockProcessors[i].destroy();
        this.blockProcessors.splice(i, 1);
      } else {
        i++;
      }
    }
  }
}
