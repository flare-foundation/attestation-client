import { IBlock, Managed, sleepMs } from "@flarenetwork/mcc";
import { CachedMccClient } from "../caching/CachedMccClient";
import { LimitingProcessor } from "../caching/LimitingProcessor";
import { failureCallback } from "../utils/helpers/promiseTimeout";
import { AttLogger } from "../utils/logging/logger";
import { BlockProcessor } from "./chain-collector-helpers/blockProcessor";
import { criticalAsync } from "./indexer-utils";
import { IndexerToClient } from "./indexerToClient";
import { Interlacing } from "./interlacing";

export interface IBlockProcessorManagerSettings {
  validateBlockBeforeProcess: boolean;
  validateBlockMaxRetry: number;
  validateBlockWaitMs: number;
}

/**
 * Manages a list of block processors, each processing a block (reading block metadata and transaction data).
 * Management includes starting, pausing, resuming, processing data on completion and switching processing of
 * active block according to priority.
 * @category Indexer
 */
@Managed()
export class BlockProcessorManager {
  indexerToClient: IndexerToClient;
  interlace: Interlacing;
  cachedClient: CachedMccClient;

  settings: IBlockProcessorManagerSettings;

  logger: AttLogger;

  // list of block processors
  blockProcessors: LimitingProcessor[] = [];

  // Called on block processing completion
  completeCallback: any;
  // Called if before actual block processing we find out that the block processing is already completed.
  alreadyCompleteCallback: any;

  // maps block number to block.
  // If block is hashed this indicates that the block is being processed or is in processing
  blockNumbersInProcessing = new Set<number>();

  constructor(
    logger: AttLogger,
    cachedClient: CachedMccClient,
    indexerToClient: IndexerToClient,
    interlace: Interlacing,
    settings: IBlockProcessorManagerSettings,
    completeCallback: any,
    alreadyCompleteCallback: any
  ) {
    this.logger = logger;
    this.indexerToClient = indexerToClient;
    this.cachedClient = cachedClient;
    this.interlace = interlace;
    this.completeCallback = completeCallback;
    this.alreadyCompleteCallback = alreadyCompleteCallback;
    this.settings = settings;
  }

  /**
   * Triggers processing of block with given block number. Used while syncing.
   * Several block processors will run in parallel while syncing.
   * @param blockNumber
   * @returns
   * Assumptions:
   * - blockNumber is valid
   */
  async processSyncBlockNumber(blockNumber: number) {
    if (this.blockNumbersInProcessing.has(blockNumber)) {
      return;
    }
    const block = await this.indexerToClient.getBlockFromClient("BlockProcessorManager.processSyncBlockNumber", blockNumber);
    this.blockNumbersInProcessing.add(blockNumber);
    await this.processSync(block);
  }

  /**
   * Triggers block processing for the block (if not started yet) while real time processing (after syncing).
   * The function manages that only one block processor can be active in order to effectively manage
   * rate limited request queue on the client. All others are paused.
   * This enable fast switching between processors according to priorities.
   * Each time the function is called the block processor for the `block` becomes active.
   * If the processor is completed, the function just calls back and exits.
   * @param block the block for which processor should be activated
   * @returns
   * Assumptions:
   * - block is on height > N
   */
  async process(block: IBlock) {
    // check if processor for this block is already completed
    if (this.blockProcessors.find((processor) => processor.block.stdBlockHash === block.stdBlockHash && processor.isCompleted)) {
      this.logger.info(`^w^Kprocess block ${block.number}^^^W (completed)`);
      // eslint-disable-next-line
      criticalAsync(`process -> BlockProcessorManager(${block.number})::alreadyCompleteCallback exception:`, () => this.alreadyCompleteCallback(block));
      return;
    }

    // Pause all processors except the block's one, if it exists.
    let processorExists = false;

    for (let i = 0; i < this.blockProcessors.length; i++) {
      if (this.blockProcessors[i].block.stdBlockHash === block.stdBlockHash) {
        processorExists = true;
        this.logger.info(`^w^Kprocess block ${block.number}^^^W (continue)`);
        // eslint-disable-next-line
        criticalAsync(`process -> BlockProcessorManager(${block.number})::blockProcessors.continue exception:`, () => this.blockProcessors[i].resume());
      } else {
        this.blockProcessors[i].pause();
      }
    }

    // Processor for the block exists and it is resumed
    if (processorExists) {
      return;
    }

    // all active processors are paused. We have to create the new one for block and start it
    const validatedBlock = await this.waitUntilBlockIsValid(block);

    this.logger.info(`^w^Kprocess block ${validatedBlock.number}`);

    // newly created block processor starts automatically
    const processor = new (BlockProcessor(this.cachedClient.chainType))(this.cachedClient);
    this.blockProcessors.push(processor);

    // terminate app on exception
    // eslint-disable-next-line
    criticalAsync(`process -> BlockProcessorManager(${block.number})::processor.initializeJobs exception:`, () =>
      processor.initializeJobs(validatedBlock, this.completeCallback)
    );
  }

  /**
   * Triggers block processing for the block (if not started yet) while syncing.
   * @param block block to process
   * @returns
   */
  async processSync(block: IBlock) {
    if (this.blockProcessors.find((processor) => processor.block.stdBlockHash === block.stdBlockHash)) {
      return;
    }

    const validatedBlock = await this.waitUntilBlockIsValid(block);

    this.logger.info(`^w^Ksync process block ${validatedBlock.number}`);

    const processor = new (BlockProcessor(this.cachedClient.chainType))(this.cachedClient);
    this.blockProcessors.push(processor);

    // terminate app on exception
    // eslint-disable-next-line
    criticalAsync(`process -> BlockProcessorManager(${block.number})::processor.initializeJobs exception:`, () =>
      processor.initializeJobs(validatedBlock, this.completeCallback)
    );
  }

  /**
   * Waits until the block is valid. While waiting block can change. The valid confirmed
   * block on the same height is returned.
   * NOTE: at the moment it is used with XRP only.
   * @param block
   * @returns valid (confirmed) block on the same height as `block`
   */
  private async waitUntilBlockIsValid(block: IBlock): Promise<IBlock> {
    if (!this.settings.validateBlockBeforeProcess) {
      return block;
    }

    let retryCount = 0;
    let currentBlock = block;
    while (!currentBlock.isValid) {
      if (retryCount++ == 0) {
        this.logger.debug2(`waiting on block ${block.number} to be valid`);
      }

      if (retryCount > this.settings.validateBlockMaxRetry) {
        failureCallback(`invalid block: block ${block.number} did not become valid in ${retryCount} retires`);
      }

      await sleepMs(this.settings.validateBlockWaitMs);

      // get block again (NOTE: on reading by block.number blocks are not cached)
      currentBlock = await this.cachedClient.client.getBlock(block.number);
    }

    if (retryCount > 0) {
      this.logger.debug(`block ${block.number} is now valid`);
    }
    return currentBlock;
  }

  /**
   * Clears all block processors up to given block (including it).
   * Clearing includes destroying processors and removing them from the list
   * @param blockNumber end block (included)
   */
  public clearProcessorsUpToBlockNumber(blockNumber: number) {
    // delete all that are block number <= completed block number
    let i = 0;
    while (i < this.blockProcessors.length) {
      if (this.blockProcessors[i].block.number <= blockNumber) {
        this.blockProcessors[i].destroy();
        this.blockProcessors.splice(i, 1);
      } else {
        i++;
      }
    }
  }

  /**
   * Clears data after sync is completed.
   */
  public onSyncCompleted() {
    this.blockNumbersInProcessing.clear();
  }
}
