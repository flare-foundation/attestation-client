import { ChainType, IBlock, Managed, MCC } from "@flarenetwork/mcc";
import { LiteBlock } from "@flarenetwork/mcc/dist/src/base-objects/blocks/LiteBlock";
import { Like } from "typeorm";
import { CachedMccClient, CachedMccClientOptions } from "../caching/CachedMccClient";
import { ChainConfiguration, ChainsConfiguration } from "../chain/ChainConfiguration";
import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DBState } from "../entity/indexer/dbState";
import { DBTransactionBase } from "../entity/indexer/dbTransaction";
import { DatabaseService } from "../utils/databaseService";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { failureCallback, retry } from "../utils/PromiseTimeout";
import { getUnixEpochTimestamp, prepareString, round, secToHHMMSS, sleepms } from "../utils/utils";
import { BlockProcessorManager } from "./blockProcessorManager";
import { HeaderCollector } from "./headerCollector";
import { criticalAsync, prepareIndexerTables, SECONDS_PER_DAY } from "./indexer-utils";
import { IndexerConfiguration, IndexerCredentials } from "./IndexerConfiguration";
import { Interlacing } from "./interlacing";

// todo:
// [ ] (later) on ALGO if N < N_bottom - delete transactions, blocks and restart sync.

class PreparedBlock {
  block: DBBlockBase;
  transactions: DBTransactionBase[];

  constructor(block: DBBlockBase, transactions: DBTransactionBase[]) {
    this.block = block;
    this.transactions = transactions;
  }
}

@Managed()
export class Indexer {
  config: IndexerConfiguration;
  chainConfig: ChainConfiguration;
  credentials: IndexerCredentials;
  chainType: ChainType;
  cachedClient: CachedMccClient;
  logger!: AttLogger;
  dbService: DatabaseService;
  blockProcessorManager: BlockProcessorManager;

  headerCollector: HeaderCollector;

  // N - last processed and saved
  N = 0;

  // T - chain height
  T = 0;

  blockNp1hash = "";
  waitNp1 = false;

  preparedBlocks = new Map<number, PreparedBlock[]>();

  dbTransactionClasses: DBTransactionBase[];
  dbBlockClass;

  // bottom block in the transaction tables - used to check if we have enough history
  bottomBlockTime = undefined;

  isSyncing = false;

  interlace = new Interlacing();

  constructor(config: IndexerConfiguration, chainsConfig: ChainsConfiguration, credentials: IndexerCredentials, chainName: string) {
    if (!config) return;

    this.config = config;
    this.credentials = credentials;
    this.chainType = MCC.getChainType(chainName);
    this.chainConfig = chainsConfig.chains.find((el) => el.name === chainName)!;

    this.logger = getGlobalLogger();

    this.dbService = new DatabaseService(this.logger, this.credentials.indexerDatabase, "indexer");

    let cachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: {
        ...this.chainConfig.mccCreate,
        rateLimitOptions: this.chainConfig.rateLimitOptions,
        loggingOptions: {
          mode: "production",
          loggingCallback: this.mccLogging.bind(this),
          warningCallback: this.mccWarning.bind(this),
          exceptionCallback: this.mccException.bind(this),
        },
      },
    };

    this.cachedClient = new CachedMccClient(this.chainType, cachedMccClientOptions);

    this.blockProcessorManager = new BlockProcessorManager(
      this,
      this.logger,
      this.cachedClient,
      this.blockCompleted.bind(this),
      this.blockAlreadyCompleted.bind(this)
    );

    this.headerCollector = new HeaderCollector(this.logger, this);
  }

  /////////////////////////////////////////////////////////////
  // MCC logging callbacks
  /////////////////////////////////////////////////////////////

  mccLogging(message: string) {
    // todo: add MCC logging verbose option
    //this.logger.info(`MCC ${message}`);
  }

  mccWarning(message: string) {
    this.logger.warning(`MCC ${message}`);
  }

  mccException(error: any, message: string) {
    logException(error, message);
  }

  /////////////////////////////////////////////////////////////
  // essential MCC function
  // they will retry several times and terminate app on failure
  /////////////////////////////////////////////////////////////

  async getBlock(label: string, blockNumber: number): Promise<IBlock> {
    // todo: implement MCC lite version of getBlock
    return await retry(`indexer.getBlock.${label}`, async () => {
      return await this.cachedClient.client.getBlock(blockNumber);
    });
  }

  async getBlockHeight(label: string): Promise<number> {
    return await retry(`indexer.getBlockHeight.${label}`, async () => {
      return this.cachedClient.client.getBlockHeight();
    });
  }

  async getBottomBlockHeight(label: string): Promise<number> {
    return await retry(`indexer.getBottomBlockHeight.${label}`, async () => {
      return this.cachedClient.client.getBottomBlockHeight();
    });
  }

  async getBlockNumberTimestamp(blockNumber: number): Promise<number> {
    // todo: get `getBlockLite` FAST version of block read since we only need timestamp
    const block = (await this.getBlock(`getBlockNumberTimestamp`, blockNumber)) as IBlock;

    if (!block) {
      this.logger.error2(`getBlockNumberTimestamp(${blockNumber}) invalid block ${block}`);
      return 0;
    }

    return block.unixTimestamp;
  }

  /////////////////////////////////////////////////////////////
  // misc
  /////////////////////////////////////////////////////////////

  getChainName(name: string) {
    return this.chainConfig.name + "_" + name;
  }
  getChainN() {
    return this.getChainName("N");
  }

  syncTimeDays(): number {
    // chain syncTimeDays overrides config syncTimeDays
    if (this.chainConfig.syncTimeDays > 0) return this.chainConfig.syncTimeDays;

    return this.config.syncTimeDays;
  }

  /////////////////////////////////////////////////////////////
  // state recording functions
  /////////////////////////////////////////////////////////////

  getStateEntry(name: string, value: number): DBState {
    const state = new DBState();

    state.name = this.getChainName(name);
    state.valueNumber = value;
    state.timestamp = getUnixEpochTimestamp();

    return state;
  }

  getStateEntryString(name: string, valueString: string, valueNum: number, comment: string = ""): DBState {
    const state = new DBState();

    state.name = this.getChainName(name);
    state.valueString = valueString;
    state.valueNumber = valueNum;
    state.timestamp = getUnixEpochTimestamp();
    state.comment = comment;

    return state;
  }

  /////////////////////////////////////////////////////////////
  // block processor callbacks
  /////////////////////////////////////////////////////////////

  async blockCompleted(block: DBBlockBase, transactions: DBTransactionBase[]): Promise<boolean> {
    this.logger.info(`^Gcompleted ${block.blockNumber}:N+${block.blockNumber - this.N} (${transactions.length} transaction(s))`);

    const isBlockNp1 = block.blockNumber == this.N + 1 && block.blockHash == this.blockNp1hash;

    if (this.waitNp1) {
      if (isBlockNp1) {
        // if we are waiting for block N+1 to be completed - then it is no need to put it into queue but just save it
        await this.blockSave(block, transactions);

        this.waitNp1 = false;

        return;
      }
    }

    // queue completed block
    let processors = this.preparedBlocks.get(block.blockNumber);
    if (!processors) {
      processors = [];
      this.preparedBlocks.set(block.blockNumber, processors);
    }
    processors.push(new PreparedBlock(block, transactions));

    // todo: this causes asycn growing - this should be queued and run from main async
    // if N+1 is ready (already processed) then begin processing N+2 (we need to be very aggressive with read ahead)
    if (!this.isSyncing) {
      if (isBlockNp1) {
        const blockNp2 = await this.getBlock(`blockCompleted`, this.N + 2);
        criticalAsync(`blockCompleted -> BlockProcessorManager::process exception: `, () => this.blockProcessorManager.process(blockNp2));
      }
    }

    return true;
  }

  async blockAlreadyCompleted(block: IBlock) {
    this.logger.info(`^Galready completed ${block.number}:N+${block.number - this.N}`);

    // todo: this causes asycn growing - this should be queued and run from main async
    // if N+1 is ready (already processed) then begin processing N+2 (we need to be very aggressive with read ahead)
    const isBlockNp1 = block.number == this.N + 1 && block.stdBlockHash == this.blockNp1hash;

    if (!this.isSyncing) {
      if (isBlockNp1) {
        const blockNp2 = await this.getBlock(`blockAlreadyCompleted`, this.N + 2);
        criticalAsync(`blockAlreadyCompleted -> BlockProcessorManager::process exception: `, () => this.blockProcessorManager.process(blockNp2));
      }
    }
  }

  /////////////////////////////////////////////////////////////
  // table interlacing prepare and management
  /////////////////////////////////////////////////////////////

  prepareTables() {
    let chainType = MCC.getChainType(this.chainConfig.name);
    let prepared = prepareIndexerTables(chainType);

    this.dbTransactionClasses = prepared.transactionTable;
    this.dbBlockClass = prepared.blockTable;
  }

  getActiveTransactionWriteTable(): DBTransactionBase {
    // we write into table by active index (opposite to drop):
    //  0 - table1
    //  1 - table0

    const index = this.interlace.getActiveIndex();

    return this.dbTransactionClasses[index === 0 ? 1 : 0];
  }

  /////////////////////////////////////////////////////////////
  // block save
  // - table interlacing
  // - retry for block save (or terminal app on failure)
  /////////////////////////////////////////////////////////////

  async blockSave(block: DBBlockBase, transactions: DBTransactionBase[]): Promise<boolean> {
    const Np1 = this.N + 1;

    if (block.blockNumber !== Np1) {
      this.logger.error2(`expected to save blockNumber ${Np1} (but got ${block.blockNumber})`);
      throw new Error(`unexpected block number: expected to save blockNumber ${Np1} (but got ${block.blockNumber})`);
    }

    this.logger.debug(`start save block N+1=${Np1}`);

    // make block copy
    // Todo: do that in augmentBlock
    const blockCopy = new this.dbBlockClass();
    for (let key of Object.keys(block)) {
      blockCopy[key] = block[key];
    }

    // fix data
    blockCopy.blockHash = prepareString(blockCopy.blockHash, 128);
    blockCopy.transactions = transactions.length;

    const time0 = Date.now();

    // create transaction and save everything with retry (terminate app on failure)
    await retry(`blockSave N=${Np1}`, async () => {
      await this.dbService.connection.transaction(async (transaction) => {
        // save state N, T and T_CHECK_TIME
        const stateEntries = [this.getStateEntry("N", Np1), this.getStateEntry("T", this.T)];

        // block must be marked as confirmed
        if (transactions.length > 0) {
          await transaction.save(transactions);
        }

        await transaction.save(blockCopy);
        await transaction.save(stateEntries);
      });
      return true;
    });

    // if bottom block is undefined then save it (this happens only on clean start or after database reset)
    if (!this.bottomBlockTime) {
      await this.saveBottomState();
    }

    // increment N if all is ok
    this.N = Np1;

    this.blockProcessorManager.clear(Np1);
    const time1 = Date.now();
    this.logger.info(`^g^Wsave completed - next N=${Np1}^^ (time=${round(time1 - time0, 2)}ms)`);

    // table interlacing
    if (this.interlace.update(block.timestamp, block.blockNumber)) {
      // bottom state was changed because one table was dropped - we need to save new value
      this.saveBottomState();
    }

    return true;
  }

  /////////////////////////////////////////////////////////////
  // Save bottom N state (used for verification)
  /////////////////////////////////////////////////////////////

  async saveBottomState() {
    try {
      const bottomBlockNumber = await this.getBottomDBBlockNumber();
      if (bottomBlockNumber) {
        const bottomBlock = await this.dbService.manager.findOne(this.dbBlockClass, { where: { blockNumber: bottomBlockNumber } });

        this.bottomBlockTime = (bottomBlock as DBBlockBase).timestamp;

        this.logger.debug(`block bottom state ${bottomBlockNumber}`);
        const bottomStates = [this.getStateEntry(`Nbottom`, bottomBlockNumber), this.getStateEntry(`NbottomTime`, this.bottomBlockTime)];
        this.dbService.manager.save(bottomStates);
      } else {
        this.logger.debug(`block bottom state is undefined`);
      }
    } catch (error) {
      logException(error, `saving block bottom state`);
    }
  }

  /////////////////////////////////////////////////////////////
  // get respective DB block number
  /////////////////////////////////////////////////////////////

  async getStartDBBlockNumber(): Promise<number> {
    const res = await this.dbService.manager.findOne(DBState, { where: { name: this.getChainN() } });

    if (res === undefined || res === null) return 0;

    return res.valueNumber;
  }

  async getBottomDBBlockNumber(): Promise<number> {
    const query0 = await this.dbService.manager.createQueryBuilder(this.dbTransactionClasses[0] as any, "blocks");
    query0.select(`MIN(blocks.blockNumber)`, "min");
    const result0 = await query0.getRawOne();

    const query1 = await this.dbService.manager.createQueryBuilder(this.dbTransactionClasses[1] as any, "blocks");
    query1.select(`MIN(blocks.blockNumber)`, "min");
    const result1 = await query1.getRawOne();

    if (!result0.min && !result1.min) {
      return undefined;
    }
    if (!result0.min) return result1.min;
    if (!result1.min) return result0.min;

    return result0.min < result1.min ? result0.min : result1.min;
  }

  /////////////////////////////////////////////////////////////
  // Syncing start block
  /////////////////////////////////////////////////////////////

  /**
   * Calculate the starting block number for sync
   * @returns block number from where to start the sync
   */
  async getSyncStartBlockNumber(): Promise<number> {
    this.logger.info(`getSyncStartBlockNumber`);

    const latestBlockNumber = (await this.getBlockHeight(`getSyncStartBlockNumber`)) - this.chainConfig.numberOfConfirmations;

    if (this.chainConfig.blockCollecting === "latestBlock") {
      // We start collecting with the latest observed block (as setup in config)
      this.logger.debug2(`blockCollecting latestBlock T=${latestBlockNumber}`);
      return latestBlockNumber;
    }

    const syncStartTime = getUnixEpochTimestamp() - this.syncTimeDays() * SECONDS_PER_DAY;
    const latestBlockTime = await this.getBlockNumberTimestamp(latestBlockNumber);

    if (latestBlockTime <= syncStartTime) {
      // This is the case where on blockchain there were no blocks after the sync time
      // Start syncing with the latest observed block
      this.logger.debug2(`latest block time before wanted syncStartTime T=${latestBlockNumber}`);
      return latestBlockNumber;
    }

    const bottomBlockHeight = await this.getBottomBlockHeight("getSyncStartBlockNumber");
    const bottomBlockTime = await this.getBlockNumberTimestamp(bottomBlockHeight);

    if (bottomBlockTime >= syncStartTime) {
      this.logger.warn(`${this.chainConfig.name} start sync block is set to node bottom block height ${bottomBlockHeight}`);
      return bottomBlockHeight;
    }

    // We ensured that blockNumberBottom.timestamp < syncStartTime < blockNumberTop.timestamp
    let blockNumberTop = latestBlockNumber;
    let blockNumberBottom = bottomBlockHeight;
    if (blockNumberBottom > blockNumberTop) {
      // This should never happen if nodes and mcc work as expected
      failureCallback(`Bottom block is larger than top block, bottom: ${blockNumberBottom}, top: ${blockNumberTop}`);
    }
    while (blockNumberTop > blockNumberBottom) {
      const blockNumberMid = Math.floor((blockNumberTop + blockNumberBottom) / 2);
      // We have 3 cases for sync start time
      //        1     2     3
      //        |     |     |
      //  o-----------O-----------o
      // Bot         Mid         Top
      const blockTimeMid = await this.getBlockNumberTimestamp(blockNumberMid);

      if (blockTimeMid < syncStartTime) {
        // Case 3
        blockNumberBottom = blockNumberMid;
      } else {
        // Case 1: We are looking for block before the current mid block
        // Case 2: We are looking for potential blocks that had the same timestamp as this block but happened before
        blockNumberTop = blockNumberMid;
      }
    }

    return blockNumberTop;
  }

  /////////////////////////////////////////////////////////////
  //
  /////////////////////////////////////////////////////////////

  /**
   * This method either
   *  * saves the next confirmed block (N+1) and returns true
   *  * indicates that no candidate block N+1 is in processing and returns false
   *  * waits for the unique N+1 block is processed and saved and returns true
   *
   * Assumptions
   *  * Block N+1 is confirmed.
   * @returns true: block was successfully saved, false: no block on height N+1 is processed or in processing
   */
  async saveOrWaitNp1Block(): Promise<boolean> {
    const Np1 = this.N + 1;

    const preparedBlocks = this.preparedBlocks.get(Np1);

    if (preparedBlocks) {
      // check if N+1 with blockNp1hash is already prepared (otherwise wait for it)
      for (let preparedBlock of preparedBlocks) {
        if (preparedBlock.block.blockHash === this.blockNp1hash) {
          // save prepared N+1 block with active hash and increment this.N
          await this.blockSave(preparedBlock.block, preparedBlock.transactions);

          // The assumption is that other blocks are invalid (orphaned) blocks
          this.preparedBlocks.delete(Np1);

          return true;
        }
      }
    }

    // check if Np1 with Np1Hash is in preparation
    let exists = false;
    for (let processor of this.blockProcessorManager.blockProcessors) {
      if (processor.block.number == Np1 && processor.block.stdBlockHash == this.blockNp1hash) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      this.logger.error2(`N+1 (${Np1}) block not in processor`);
      // False is returned to indicate that further waiting needs to be done, recheck this at later time
      return false;
    }

    // wait until N+1 block is saved (blockCompleted will save it immediately)
    this.waitNp1 = true;

    this.logger.debug(`^Gwaiting for block N=${Np1}`);

    // todo: [optimization] check how to use signals in TS (instead of loop with sleep)
    let timeStart = Date.now();

    while (this.waitNp1) {
      await sleepms(100);

      // If block processing takes more than 5 seconds we start to log warnings every 5 seconds
      if (Date.now() - timeStart > 5000) {
        this.logger.warning(`saveOrWaitNp1Block timeout`);
        timeStart = Date.now();
      }
    }

    return true;
  }

  /////////////////////////////////////////////////////////////
  // Sync functions
  /////////////////////////////////////////////////////////////

  /**
   *
   * @returns
   */
  async runSyncRaw() {
    // for status display
    let statsN = this.N;
    let statsTime = Date.now();
    let statsBlocksPerSec = 0;

    this.T = await this.getBlockHeight(`runSyncRaw1`);

    this.isSyncing = true;

    let lastN = -1;

    while (true) {
      this.logger.debug1(`runSyncRaw loop N=${this.N} T=${this.T}`);
      const now = Date.now();

      // get chain top block
      if (now > statsTime + this.config.syncUpdateTimeMs) {
        // stats
        statsBlocksPerSec = ((this.N - statsN) * 1000) / (now - statsTime);
        statsN = this.N;
        statsTime = now;

        // take actual top
        this.T = await this.getBlockHeight(`runSyncRaw2`);
      }

      // wait until we save N+1 block
      if (lastN === this.N) {
        this.logger.debug(`runSyncRaw wait block N=${this.N} T=${this.T}`);
        await sleepms(100);
        continue;
      }
      lastN = this.N;

      // status
      const dbStatus = this.getStateEntryString("state", "sync", -1);

      const blockLeft = this.T - this.N;

      if (statsBlocksPerSec > 0) {
        const timeLeft = (this.T - this.N) / statsBlocksPerSec;

        dbStatus.valueNumber = timeLeft;

        this.logger.debug(
          `sync ${this.N} to ${this.T}, ${blockLeft} blocks (ETA: ${secToHHMMSS(timeLeft)} bps: ${round(statsBlocksPerSec, 2)} cps: ${
            this.cachedClient.reqsPs
          })`
        );
      } else {
        this.logger.debug(`sync ${this.N} to ${this.T}, ${blockLeft} blocks (cps: ${this.cachedClient.reqsPs})`);
      }

      await retry(`runSyncRaw::saveStatus`, async () => this.dbService.manager.save(dbStatus));

      // check if syncing has ended
      if (this.N >= this.T - this.chainConfig.numberOfConfirmations) {
        this.logger.group("SyncRaw completed");
        this.isSyncing = false;
        // To break the sync while(true) loop
        return;
      }

      await this.blockProcessorManager.processSyncBlockNumber(this.N + 1);

      for (let i = 2; i < this.chainConfig.syncReadAhead; i++) {
        // do not allow read ahead of T - confirmations
        if (this.N + i > this.T - this.chainConfig.numberOfConfirmations) break;
        criticalAsync(`runSyncRaw -> blockProcessorManager::processSyncBlockNumber exception `, () =>
          this.blockProcessorManager.processSyncBlockNumber(this.N + i)
        );
      }

      const blockNp1 = await this.cachedClient.getBlock(this.N + 1);
      this.blockNp1hash = blockNp1.stdBlockHash;

      // We wait until block N+1 is either saved or indicated that there is no such block
      while (!(await this.saveOrWaitNp1Block())) {
        await sleepms(100);
        this.logger.debug(`runSyncRaw wait save N=${this.N} T=${this.T}`);
      }
    }
  }

  /**
   *
   */
  async runSyncTips() {
    // Collect all alternative tips
    this.logger.info(`collecting top blocks...`);
    const blocks: LiteBlock[] = await this.cachedClient.client.getTopLiteBlocks(this.T - this.N);
    this.logger.debug(`${blocks.length} block(s) collected`);

    // Save all block headers from tips above N
    // Note - N may be very low compared to T, since we are 
    // before sync.
    await this.headerCollector.saveBlocksOrHeadersOnNewTips(blocks);

    // Sync and save all confirmed blocks from main fork
    await this.runSyncRaw();
  }

  // async runSyncTipsOld() {
  //   // for status display
  //   let statsN = this.N;
  //   let statsTime = Date.now();
  //   let statsBlocksPerSec = 0;

  //   this.T = await this.getBlockHeight(`runSyncTips1`);

  //   this.logger.info(`collecting top blocks...`);
  //   const blocks: LiteBlock[] = await this.cachedClient.client.getTopLiteBlocks(this.T - this.N);
  //   this.logger.debug(`${blocks.length} block(s) collected`);

  //   this.isSyncing = true;

  //   const start = Date.now();

  //   for (let i = 1; i < blocks.length - this.chainConfig.numberOfConfirmations; i++) {
  //     await this.blockProcessorManager.processSyncBlockHash(blocks[i].stdBlockHash);

  //     for (let j = i + 1; j < i + this.chainConfig.syncReadAhead && j < blocks.length; j++) {
  //       criticalAsync(`runSyncTips -> blockProcessorManager::processSyncBlockHash exception `, () =>
  //         this.blockProcessorManager.processSyncBlockHash(blocks[j].stdBlockHash)
  //       );
  //     }

  //     const block = blocks[i];

  //     this.N = block.number - 1;
  //     this.blockNp1hash = block.stdBlockHash;

  //     await this.saveOrWaitNp1Block();

  //     // stats
  //     const now = Date.now();

  //     statsBlocksPerSec = ((i + 1) * 1000) / (now - start);
  //     statsN = this.N;
  //     statsTime = now;

  //     const timeLeft = (this.T - this.N) / statsBlocksPerSec;

  //     const dbStatus = this.getStateEntryString("state", "sync", -1);
  //     dbStatus.valueNumber = timeLeft;

  //     await retry(`runSyncTips::saveStatus`, async () => this.dbService.manager.save(dbStatus));

  //     const blockLeft = this.T - block.number;

  //     this.logger.debug(
  //       `sync ${this.N} to ${this.T}, ${blockLeft} blocks (ETA: ${secToHHMMSS(timeLeft)} bps: ${round(statsBlocksPerSec, 2)} cps: ${this.cachedClient.reqsPs})`
  //     );
  //   }

  //   this.logger.group("Sync completed");
  //   this.isSyncing = false;
  // }

  async runSyncLatestBlock() {
    this.N = await this.getBlockHeight(`getLatestBlock`);

    this.logger.debug2(`runSyncLatestBlock latestBlock ${this.N}`);

    await this.runSyncRaw();
  }

  async runSync() {
    switch (this.chainConfig.blockCollecting) {
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

  /////////////////////////////////////////////////////////////
  // command line processing functionality
  /////////////////////////////////////////////////////////////

  async processCommandLineParameters(args: any) {
    // Force N
    if (args.setn !== 0) {
      let n = args.setn;

      if (args.setn < 0) {
        const t = await this.getBlockHeight(`runIndexer2`);

        this.logger.error2(`force set N to T - ${-n}=${t}`);

        n = t + n;
      } else {
        this.logger.error2("force set N to ");
      }

      const stateEntry = this.getStateEntry("N", n);

      await this.dbService.manager.save(stateEntry);
    }

    // check if reset all databases is requested
    if (args.reset === "RESET_COMPLETE") {
      this.logger.error2("command: RESET_COMPLETE");

      await this.dropTable(`state`);

      for (let i of [`xrp`, `btc`, `ltc`, "doge", "algo"]) {
        await this.dropAllChainTables(i);
      }

      this.logger.info("completed - exiting");

      // stop app
      return true;
    }

    // check if reset active database is requested
    if (args.reset === "RESET_ACTIVE") {
      this.logger.error2("command: RESET_ACTIVE");

      // reset state for this chain
      await this.dbService.manager.delete(DBState, { name: Like(`${this.chainConfig.name}_%`) });

      await this.dropAllChainTables(this.chainConfig.name);

      this.logger.info("completed - exiting");

      // stop app
      return true;
    }

    // continue running
    return false;
  }

  async dropTable(name: string) {
    try {
      this.logger.info(`dropping table ${name}`);

      const queryRunner = this.dbService.connection.createQueryRunner();
      const table = await queryRunner.getTable(name);
      if (!table) {
        this.logger.error(`unable to find table ${name}`);
        return;
      }
      await queryRunner.dropTable(table);
      await queryRunner.release();
    } catch (error) {
      logException(error, `dropTable`);
    }
  }

  async dropAllChainTables(chain: string) {
    chain = chain.toLocaleLowerCase();

    await this.dropTable(`${chain}_block`);
    await this.dropTable(`${chain}_transactions0`);
    await this.dropTable(`${chain}_transactions1`);
  }

  /////////////////////////////////////////////////////////////
  // main indexer entry function
  /////////////////////////////////////////////////////////////

  async runIndexer(args: any) {
    // setup tracing
    //traceManager.displayRuntimeTrace = true;
    //TraceManager.enabled = false;
    //traceManager.displayStateOnException = false;

    // wait for db to connect
    await this.dbService.waitForDBConnection();

    if (await this.processCommandLineParameters(args)) {
      return;
    }

    await this.prepareTables();

    await this.saveBottomState();

    const startBlockNumber = (await this.getBlockHeight(`runIndexer1`)) - this.chainConfig.numberOfConfirmations;
    // initial N initialization - will be later on assigned to DB or sync N
    this.N = startBlockNumber;

    // N is last completed block - confirmed and stored in DB
    const dbStartBlockNumber = await this.getStartDBBlockNumber();
    if (dbStartBlockNumber > 0) {
      this.N = dbStartBlockNumber;
    }

    await this.interlace.initialize(
      this.logger,
      this.dbService,
      this.dbTransactionClasses,
      this.chainConfig.minimalStorageHistoryDays,
      this.chainConfig.minimalStorageHistoryBlocks,
      this.chainConfig.name
    );

    // sync date
    if (this.config.syncEnabled) {
      const syncStartBlockNumber = await this.getSyncStartBlockNumber();

      this.N = Math.max(dbStartBlockNumber, syncStartBlockNumber);

      this.logger.group(`Sync started (${this.syncTimeDays()} days)`);

      await this.runSync();
    }

    criticalAsync("runBlockHeaderCollecting", async () => this.headerCollector.runBlockHeaderCollecting());

    let processedBlocks = 0;

    while (true) {
      const time0 = getTimeMilli();
      // get chain top block
      this.T = await this.getBlockHeight(`runIndexer2`);

      // change getBlock to getBlockHeader
      let blockNp1 = await this.getBlock(`runIndexer2`, this.N + 1);

      // has N+1 confirmation block
      const isNewBlock = this.N < this.T - this.chainConfig.numberOfConfirmations;
      const isChangedNp1Hash = this.blockNp1hash !== blockNp1.stdBlockHash;

      // status
      const NisReady = this.N >= this.T - this.chainConfig.numberOfConfirmations - 2;
      const syncTimeSec = this.syncTimeDays() * SECONDS_PER_DAY;
      const fullHistory = !this.bottomBlockTime ? false : blockNp1.unixTimestamp - this.bottomBlockTime > syncTimeSec;
      let dbStatus;
      if (!fullHistory) {
        dbStatus = this.getStateEntryString(
          "state",
          "running-sync",
          processedBlocks++,
          `N=${this.N} T=${this.T} (history is not ready: missing ${(syncTimeSec - (blockNp1.unixTimestamp - this.bottomBlockTime)) / 60} min)`
        );
      } else if (!NisReady) {
        dbStatus = this.getStateEntryString(
          "state",
          "running-sync",
          processedBlocks++,
          `N=${this.N} T=${this.T} (N is late: < T-${this.chainConfig.numberOfConfirmations})`
        );
      } else {
        dbStatus = this.getStateEntryString("state", "running", processedBlocks++, `N=${this.N} T=${this.T}`);
      }

      await retry(`runIndexer::saveStatus`, async () => await this.dbService.manager.save(dbStatus));

      const time1 = getTimeMilli();

      // check if N + 1 hash is the same
      if (!isNewBlock && !isChangedNp1Hash) {
        await sleepms(this.config.blockCollectTimeMs);

        this.logger.debug3(`indexer waiting for new block (time ${time1 - time0} ms`);

        continue;
      }

      this.logger.info(`^Wnew block T=${this.T} N=${this.N} ${isChangedNp1Hash ? "(N+1 hash changed)" : ""}`);

      // save completed N+1 block or wait for it
      if (isNewBlock) {
        await this.saveOrWaitNp1Block();

        // N has changed so we must get N+1 again
        blockNp1 = await this.getBlock(`runIndexer3`, this.N + 1);
      }

      // process new or changed N+1
      this.blockNp1hash = blockNp1.stdBlockHash;
      criticalAsync(`runIndexer -> BlockProcessorManager::process exception: `, () => this.blockProcessorManager.process(blockNp1));
    }
  }
}
