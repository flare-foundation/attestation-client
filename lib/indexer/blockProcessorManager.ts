import { IBlock, Managed } from "@flarenetwork/mcc";
import { CachedMccClient } from "../caching/CachedMccClient";
import { LimitingProcessor } from "../caching/LimitingProcessor";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { retry } from "../utils/PromiseTimeout";
import { BlockProcessor } from "./chain-collector-helpers/blockProcessor";
import { Indexer } from "./indexer";
import { noAwaitAsyncTerminateAppOnException } from "./indexer-utils";

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

    noAwaitAsyncTerminateAppOnException(`processSyncBlockNumber -> BlockProcessorManager::process exception: `, () => this.process(block, true));
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
    noAwaitAsyncTerminateAppOnException(`processSyncBlockHash -> BlockProcessorManager::process exception: `, () => this.process(block, true));
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

          noAwaitAsyncTerminateAppOnException(`process -> BlockProcessorManager::alreadyCompleteCallback exception:`, () =>
            this.alreadyCompleteCallback(block)
          );

          return;
        }

        this.logger.info(`^w^Kprocess block ${block.number}^^^W (continue)`);
        noAwaitAsyncTerminateAppOnException(`process -> BlockProcessorManager::blockProcessors.continue exception:`, () => this.blockProcessors[a].continue());
      } else {
        if (!syncMode) {
          this.blockProcessors[a].pause();
        }
      }
    }

    if (started) return;

    this.logger.info(`^w^Kprocess block ${block.number}`);

    const processor = new (BlockProcessor(this.cachedClient.chainType))(this.indexer);
    this.blockProcessors.push(processor);

    //processor.debugOn( block.hash );

    // terminate app on exception
    noAwaitAsyncTerminateAppOnException(`process -> BlockProcessorManager::processor.initializeJobs exception:`, () =>
      processor.initializeJobs(block, this.completeCallback)
    );
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
