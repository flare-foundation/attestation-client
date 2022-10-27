import { IBlockTip, Managed } from "@flarenetwork/mcc";
import { exit } from "process";
import { AttLogger } from "../utils/logger";
import { failureCallback, retry } from "../utils/PromiseTimeout";
import { getUnixEpochTimestamp, round, secToHHMMSS, sleepms } from "../utils/utils";
import { Indexer } from "./indexer";
import { criticalAsync, SECONDS_PER_DAY } from "./indexer-utils";

/**
 * Takes care of indexing confirmed blocks in the past (performs syncing to up-to-date).
 * In brings the indexer database to up-to date state where only real-time blocks are 
 * processed.
 */
@Managed()
export class IndexerSync {
  indexer: Indexer;

  logger: AttLogger;

  // indicator for sync mode
  isSyncing = false;

  constructor(indexer: Indexer) {
    this.indexer = indexer;

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

    const latestBlockNumber = (await this.indexer.getBlockHeightFromClient(`getSyncStartBlockNumber`)) - this.indexer.chainConfig.numberOfConfirmations;

    if (this.indexer.chainConfig.blockCollecting === "latestBlock") {
      // We start collecting with the latest observed block (as setup in config)
      this.logger.debug2(`blockCollecting latestBlock T=${latestBlockNumber}`);
      return latestBlockNumber;
    }

    const syncStartTime = getUnixEpochTimestamp() - this.indexer.syncTimeDays() * SECONDS_PER_DAY;
    const latestBlockTime = await this.indexer.getBlockNumberTimestampFromClient(latestBlockNumber);

    if (latestBlockTime <= syncStartTime) {
      // This is the case where on blockchain there were no blocks after the sync time
      // Start syncing with the latest observed block
      this.logger.debug2(`latest block time before wanted syncStartTime T=${latestBlockNumber}`);
      return latestBlockNumber;
    }

    const bottomBlockHeight = await this.indexer.getBottomBlockHeightFromClient("getSyncStartBlockNumber");
    const bottomBlockTime = await this.indexer.getBlockNumberTimestampFromClient(bottomBlockHeight);

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

    // Returns exact block or 1 block earlier than sync start time
    let blockRead = 2;
    while (blockNumberTop > blockNumberBottom + 1) {
      const blockNumberMid = Math.floor((blockNumberTop + blockNumberBottom) / 2);
      // We have 3 cases for sync start time
      //        1     2     3
      //        |     |     |
      //  o-----------O-----------o
      // Bot         Mid         Top
      const blockTimeMid = await this.indexer.getBlockNumberTimestampFromClient(blockNumberMid);
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

    const blockNumberBottomTime = await this.indexer.getBlockNumberTimestampFromClient(blockNumberBottom);
    this.logger.debug2(`getSyncStartBlockNumber info: block number ${blockNumberBottom} block time ${blockNumberBottomTime} start time ${syncStartTime} (block read ${blockRead})`);

    return blockNumberBottom;
  }

  /**
   * Performs syncing. When syncing to the latest block is done, the function exits.
   */
  private async runSyncRaw() {
    // for status display
    let statsN = this.indexer.N;
    let statsTime = Date.now();
    let statsBlocksPerSec = 0;

    this.indexer.T = await this.indexer.getBlockHeightFromClient(`runSyncRaw1`);

    this.isSyncing = true;

    let lastN = -1;

    while (true) {
      this.logger.debug1(`runSyncRaw loop N=${this.indexer.N} T=${this.indexer.T}`);
      const now = Date.now();

      // get chain top block
      if (now > statsTime + this.indexer.config.syncUpdateTimeMs) {
        // stats
        statsBlocksPerSec = ((this.indexer.N - statsN) * 1000) / (now - statsTime);
        statsN = this.indexer.N;
        statsTime = now;

        // take actual top
        this.indexer.T = await this.indexer.getBlockHeightFromClient(`runSyncRaw2`);
      }

      // wait until we save N+1 block
      if (lastN === this.indexer.N) {
        this.logger.debug(`runSyncRaw wait block N=${this.indexer.N} T=${this.indexer.T}`);
        await sleepms(100);
        continue;
      }
      lastN = this.indexer.N;

      // status
      const dbStatus = this.indexer.getStateEntryString("state", "sync", -1);

      const blockLeft = this.indexer.T - this.indexer.N;

      if (statsBlocksPerSec > 0) {
        const timeLeft = (this.indexer.T - this.indexer.N) / statsBlocksPerSec;

        dbStatus.valueNumber = timeLeft;

        this.logger.debug(
          `sync ${this.indexer.N} to ${this.indexer.T}, ${blockLeft} blocks (ETA: ${secToHHMMSS(timeLeft)} bps: ${round(statsBlocksPerSec, 2)} cps: ${this.indexer.cachedClient.reqsPs
          })`
        );
      } else {
        this.logger.debug(`sync ${this.indexer.N} to ${this.indexer.T}, ${blockLeft} blocks (cps: ${this.indexer.cachedClient.reqsPs})`);
      }

      await retry(`runSyncRaw::saveStatus`, async () => this.indexer.dbService.manager.save(dbStatus));

      // check if syncing has ended
      if (this.indexer.N >= this.indexer.T - this.indexer.chainConfig.numberOfConfirmations) {
        this.logger.group("SyncRaw completed");
        this.isSyncing = false;
        this.indexer.blockProcessorManager.onSyncCompleted();
        // To break the sync while(true) loop
        return;
      }

      // ensure that block processor N + 1 is created
      await this.indexer.blockProcessorManager.processSyncBlockNumber(this.indexer.N + 1);

      // triggering processors for few read ahead blocks
      for (let i = 2; i < this.indexer.chainConfig.syncReadAhead; i++) {
        // do not allow read ahead of T - confirmations
        if (this.indexer.N + i > this.indexer.T - this.indexer.chainConfig.numberOfConfirmations) break;
        
        // eslint-disable-next-line
        criticalAsync(`runSyncRaw -> blockProcessorManager::processSyncBlockNumber exception `, () =>
          this.indexer.blockProcessorManager.processSyncBlockNumber(this.indexer.N + i)
        );
      }

      // Get the latest hash of the N + 1 block
      const blockNp1 = await this.indexer.cachedClient.getBlock(this.indexer.N + 1);
      this.indexer.blockNp1hash = blockNp1.stdBlockHash;

      // We wait until block N+1 is either saved or indicated that there is no such block
      // This is the only point in the loop that increments N
      while (!(await this.indexer.trySaveNp1Block())) {
        await sleepms(100);
        this.logger.debug(`runSyncRaw wait save N=${this.indexer.N} T=${this.indexer.T}`);
      }
    }
  }

  /**
   * Carries out special type of syncing for forkable blockchains.
   * Headers of blocks in forks are collected in addition to indexing the main fork.
   */
  private async runSyncTips() {
    this.indexer.T = await this.indexer.getBlockHeightFromClient(`runSyncTips`);

    const startN = this.indexer.N;

    await this.runSyncRaw();

    // update state
    const dbStatus = this.indexer.getStateEntryString("state", "waiting", 0, "collecting tips");
    await retry(`runIndexer::saveStatus`, async () => await this.indexer.dbService.manager.save(dbStatus));

    // Collect all alternative tips
    this.logger.info(`collecting top blocks...`);
    const blocks: IBlockTip[] = await this.indexer.cachedClient.client.getTopLiteBlocks(this.indexer.T - startN, false);
    this.logger.debug(`${blocks.length} block(s) collected`);

    // Save all block headers from tips above N
    // Note - N may be very low compared to T, since we are 
    // before sync.
    await this.indexer.headerCollector.saveHeadersOnNewTips(blocks);
  }

  /**
   * Carries out syncing from the latest block. Used for testing purposes only.
   */
  private async runSyncLatestBlock() {
    this.indexer.N = await this.indexer.getBlockHeightFromClient(`getLatestBlock`);

    this.logger.debug2(`runSyncLatestBlock latestBlock ${this.indexer.N}`);

    await this.runSyncRaw();
  }

  /**
   * Syncs blocks depending on mode set in configuration.
   * @param dbStartBlockNumber 
   * @returns 
   */
  public async runSync(dbStartBlockNumber: number) {
    if (!this.indexer.config.syncEnabled) {
      return;
    }

    const syncStartBlockNumber = await this.getSyncStartBlockNumber();  // N ... start reading N+1

    // check if syncN is bigger than DB-N.
    if (dbStartBlockNumber > 0 && dbStartBlockNumber < syncStartBlockNumber) {
      // note that this drops the table when dbStartBlockNumber + 1 = syncStartBlockNumber which would be valid from continuity stand point 
      // but in case that sync N was node bottom block we would not be able to read block number sync N.
      // here we are a bit more defensive since it is a very low probability of this actually happening.

      this.logger.error(`runSync possible gap detected DB_N=${dbStartBlockNumber} Sync_N=${syncStartBlockNumber} - resetting ${this.indexer.chainConfig.name} indexer DB and state`);

      // drop both tables
      //await this.indexer.interlace.resetAll();

      exit(4);
    }

    this.indexer.N = Math.max(dbStartBlockNumber, syncStartBlockNumber);

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