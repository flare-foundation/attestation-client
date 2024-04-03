import { BlockTipBase, Managed } from "@flarenetwork/mcc";
import { failureCallback, retry } from "../utils/helpers/promiseTimeout";
import { getUnixEpochTimestamp, round, secToHHMMSS, sleepMs } from "../utils/helpers/utils";
import { AttLogger } from "../utils/logging/logger";
import { Indexer } from "./indexer";
import { SECONDS_PER_DAY, criticalAsync, getStateEntryString } from "./indexer-utils";
import { IndexerToClient } from "./indexerToClient";

/**
 * Takes care of indexing confirmed blocks in the past (performs syncing to up-to-date).
 * In brings the indexer database to up-to date state where only real-time blocks are
 * processed.
 */
@Managed()
export class IndexerSync {
  indexer: Indexer;
  indexerToClient: IndexerToClient;

  logger: AttLogger;

  // indicator for sync mode
  isSyncing = false;

  constructor(indexer: Indexer) {
    this.indexer = indexer;
    this.indexerToClient = indexer.indexerToClient;
    this.logger = indexer.logger;
  }

  /////////////////////////////////////////////////////////////
  // Syncing start block
  /////////////////////////////////////////////////////////////

  /**
   * Calculates the starting block number for sync
   * @returns block number from where to start the sync
   */
  public async getSyncStartBlockNumber(): Promise<number> {
    this.logger.info(`getSyncStartBlockNumber`);

    const latestBlockNumber = (await this.indexerToClient.getBlockHeightFromClient(`getSyncStartBlockNumber`)) - this.indexer.chainConfig.numberOfConfirmations;

    if (this.indexer.chainConfig.blockCollecting === "latestBlock") {
      // We start collecting with the latest observed block (as setup in config)
      this.logger.debug2(`blockCollecting latestBlock T=${latestBlockNumber}`);
      return latestBlockNumber;
    }

    const syncStartTime = getUnixEpochTimestamp() - this.indexer.syncTimeDays() * SECONDS_PER_DAY; //in seconds
    const latestBlockTime = await this.indexerToClient.getBlockNumberTimestampFromClient(latestBlockNumber); //in seconds

    if (latestBlockTime <= syncStartTime) {
      // This is the case where on blockchain there were no blocks after the sync time
      // Start syncing with the latest observed block
      this.logger.debug2(`latest block time before wanted syncStartTime T=${latestBlockNumber}`);
      return latestBlockNumber;
    }

    const bottomBlockHeight = await this.indexerToClient.getBottomBlockHeightFromClient("getSyncStartBlockNumber");
    const bottomBlockTime = await this.indexerToClient.getBlockNumberTimestampFromClient(bottomBlockHeight);

    if (bottomBlockTime >= syncStartTime) {
      this.logger.warning(`${this.indexer.chainConfig.name} start sync block is set to node bottom block height ${bottomBlockHeight}`);
      return bottomBlockHeight;
    }

    // We ensured that blockNumberBottom.timestamp < syncStartTime < blockNumberTop.timestamp
    let blockNumberTop = latestBlockNumber;
    let blockNumberBottom = bottomBlockHeight;
    if (blockNumberBottom > blockNumberTop) {
      // This should never happen if nodes and mcc work as expected
      failureCallback(`Bottom block is larger than top block, bottom: ${blockNumberBottom}, top: ${blockNumberTop}`);
    }

    // Returns1 block earlier than sync start time (or sometimes block on sync start time) using bisection
    let blockRead = 2;
    while (blockNumberTop > blockNumberBottom + 1) {
      const blockNumberMid = Math.floor((blockNumberTop + blockNumberBottom) / 2);
      // We have 3 cases for sync start time
      //        1     2     3
      //        |     |     |
      //  o-----------O-----------o
      // Bot         Mid         Top
      const blockTimeMid = await this.indexerToClient.getBlockNumberTimestampFromClient(blockNumberMid);
      blockRead++;

      if (blockTimeMid < syncStartTime) {
        // Case 3
        blockNumberBottom = blockNumberMid;
      } else {
        // Case 1: We are looking for block before the current mid block
        // Case 2: We are looking for potential blocks that had the same timestamp as this block but happened before
        blockNumberTop = blockNumberMid;
      }
    }

    // check if we can return previous block so that sync will also collect that block (it starts on start_block + 1)
    if (blockNumberBottom > bottomBlockHeight) {
      blockNumberBottom--;
    }

    const blockNumberBottomTime = await this.indexerToClient.getBlockNumberTimestampFromClient(blockNumberBottom);
    this.logger.debug2(
      `getSyncStartBlockNumber info: block number ${blockNumberBottom} block time ${blockNumberBottomTime} start time ${syncStartTime} (block read ${blockRead})`
    );

    return blockNumberBottom;
  }

  /**
   * Performs syncing. When syncing to the latest block is done, the function exits.
   */
  private async runSyncRaw() {
    // for status display
    let statsN = this.indexer.indexedHeight;
    let statsTime = Date.now();
    let statsBlocksPerSec = 0;

    this.indexer.tipHeight = await this.indexerToClient.getBlockHeightFromClient(`runSyncRaw1`);

    this.isSyncing = true;

    let lastN = -1;

    while (true) {
      this.logger.debug1(`runSyncRaw loop N=${this.indexer.indexedHeight} T=${this.indexer.tipHeight}`);
      const now = Date.now();

      // get chain top block
      if (now > statsTime + this.indexer.config.syncUpdateTimeMs) {
        // stats
        statsBlocksPerSec = ((this.indexer.indexedHeight - statsN) * 1000) / (now - statsTime);
        statsN = this.indexer.indexedHeight;
        statsTime = now;

        // take actual top
        this.indexer.tipHeight = await this.indexerToClient.getBlockHeightFromClient(`runSyncRaw2`);
      }

      // wait until we save N+1 block
      // this never happens: lastN=-1, indexer.N>=0
      if (lastN === this.indexer.indexedHeight) {
        this.logger.debug(`runSyncRaw wait block N=${this.indexer.indexedHeight} T=${this.indexer.tipHeight}`);
        await sleepMs(100);
        continue;
      }
      lastN = this.indexer.indexedHeight;

      // status
      const dbStatus = getStateEntryString("state", this.indexer.chainConfig.name, "sync", -1);

      const blocksLeft = this.indexer.tipHeight - this.indexer.indexedHeight - this.indexer.chainConfig.numberOfConfirmations;

      if (statsBlocksPerSec > 0) {
        const timeLeft = (this.indexer.tipHeight - this.indexer.indexedHeight) / statsBlocksPerSec;

        dbStatus.valueNumber = Math.floor(timeLeft);

        this.logger.debug(
          `sync ${this.indexer.indexedHeight} to ${this.indexer.tipHeight}, ${blocksLeft} blocks (ETA: ${secToHHMMSS(timeLeft)} bps: ${round(
            statsBlocksPerSec,
            2
          )} cps: ${this.indexer.cachedClient.reqsPs})`
        );
      } else {
        this.logger.debug(`sync ${this.indexer.indexedHeight} to ${this.indexer.tipHeight}, ${blocksLeft} blocks (cps: ${this.indexer.cachedClient.reqsPs})`);
      }

      await retry(`runSyncRaw::saveStatus`, async () => this.indexer.dbService.manager.save(dbStatus));
      // check if syncing has ended
      if (this.indexer.indexedHeight >= this.indexer.tipHeight - this.indexer.chainConfig.numberOfConfirmations) {
        this.logger.group("SyncRaw completed");
        this.isSyncing = false;
        this.indexer.blockProcessorManager.onSyncCompleted();
        // To break the sync while(true) loop
        return;
      }

      // ensure that block processor N + 1 is created
      await this.indexer.blockProcessorManager.processSyncBlockNumber(this.indexer.indexedHeight + 1);

      // triggering processors for few read ahead blocks
      for (let i = 2; i < this.indexer.chainConfig.syncReadAhead; i++) {
        // do not allow read ahead of TipHeight - confirmations
        if (this.indexer.indexedHeight + i > this.indexer.tipHeight - this.indexer.chainConfig.numberOfConfirmations) break;

        // eslint-disable-next-line
        criticalAsync(`runSyncRaw -> blockProcessorManager::processSyncBlockNumber exception `, () =>
          this.indexer.blockProcessorManager.processSyncBlockNumber(this.indexer.indexedHeight + i)
        );
      }

      // Get the latest hash of the next block
      const blockNext = await this.indexer.cachedClient.getBlock(this.indexer.indexedHeight + 1);
      this.indexer.nextBlockHash = blockNext.stdBlockHash ? blockNext.stdBlockHash.toLowerCase() : "";

      // We wait until block N+1 is either saved or indicated that there is no such block
      // This is the only point in the loop that increments N
      while (!(await this.indexer.trySaveNextBlock())) {
        await sleepMs(100);
        this.logger.debug(`runSyncRaw wait save N=${this.indexer.indexedHeight} T=${this.indexer.tipHeight}`);
      }
    }
  }

  /**
   * Carries out special type of syncing for forkable blockchains.
   * Headers of blocks in forks are collected in addition to indexing the main fork.
   */
  private async runSyncTips() {
    this.indexer.tipHeight = await this.indexerToClient.getBlockHeightFromClient(`runSyncTips`);

    const startN = this.indexer.indexedHeight;

    await this.runSyncRaw();

    // update state
    const dbStatus = getStateEntryString("state", this.indexer.chainConfig.name, "waiting", 0, "collecting tips");
    await retry(`runIndexer::saveStatus`, async () => await this.indexer.dbService.manager.save(dbStatus));

    // Collect all alternative tips
    this.logger.info(`collecting top blocks...`);
    const blocks: BlockTipBase[] = await this.indexer.cachedClient.client.getTopLiteBlocks(this.indexer.tipHeight - startN, false);
    this.logger.debug(`${blocks.length} block(s) collected`);

    // Save all block headers from tips above N
    // Note - indexedHeight may be very low compared to tipHeight, since we are
    // before sync.
    await this.indexer.headerCollector.saveHeadersOnNewTips(blocks);
  }

  /**
   * Carries out syncing from the latest block. Used for testing purposes only.
   */
  private async runSyncLatestBlock() {
    this.indexer.indexedHeight = await this.indexerToClient.getBlockHeightFromClient(`getLatestBlock`);

    this.logger.debug2(`runSyncLatestBlock latestBlock ${this.indexer.indexedHeight}`);

    await this.runSyncRaw();
  }

  /**
   * Syncs blocks depending on mode set in configuration.
   * @param dbLastSavedBlockNumber Top database block number (N).
   * @returns
   */
  public async runSync(dbLastSavedBlockNumber: number) {
    if (!this.indexer.config.syncEnabled) {
      return;
    }

    const syncStartBlockNumber = await this.getSyncStartBlockNumber(); // N ... start reading N+1

    // check if syncN is bigger than DB_N.
    if (dbLastSavedBlockNumber > 0 && dbLastSavedBlockNumber < syncStartBlockNumber) {
      // this can happen if indexer is not run for some time and last save block number is below sync start block number.

      await this.indexer.resetDatabaseAndStop(
        `last database block number DB_N=${dbLastSavedBlockNumber} is below indexer start block number Sync_N=${syncStartBlockNumber} - resetting ${this.indexer.chainConfig.name} indexer DB and state`
      );

      return; //for testing
    }

    this.indexer.indexedHeight = Math.max(dbLastSavedBlockNumber, syncStartBlockNumber);

    this.logger.group(`Sync started (${this.indexer.syncTimeDays()} days)`);

    switch (this.indexer.chainConfig.blockCollecting) {
      case "raw":
      case "rawUnforkable":
        await this.runSyncRaw();
        break;
      case "tips":
        await this.runSyncTips();
        break;
      case "latestBlock":
        await this.runSyncLatestBlock();
        break;
    }
  }
}
