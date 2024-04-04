import { BlockBase, ChainType, Managed, MCC } from "@flarenetwork/mcc";
import { exit } from "process";
import { EntityTarget } from "typeorm";
import { ChainConfig } from "../attester/configs/ChainConfig";
import { CachedMccClient, CachedMccClientOptions } from "../caching/CachedMccClient";
import { DBBlockBase, IDBBlockBase } from "../entity/indexer/dbBlock";
import { DBState } from "../entity/indexer/dbState";
import { DBTransactionBase, IDBTransactionBase } from "../entity/indexer/dbTransaction";
import { DatabaseService } from "../utils/database/DatabaseService";
import { failureCallback, retry } from "../utils/helpers/promiseTimeout";
import { round, sleepMs } from "../utils/helpers/utils";
import { AttLogger, getGlobalLogger, logException } from "../utils/logging/logger";
import { BlockProcessorManager } from "./blockProcessorManager";
import { HeaderCollector } from "./headerCollector";
import { criticalAsync, getStateEntry, getStateEntryString, prepareIndexerTables, SECONDS_PER_DAY, SUPPORTED_CHAINS } from "./indexer-utils";
import { IndexerConfig } from "./IndexerConfig";
import { IndexerSync } from "./indexerSync";
import { IndexerToClient } from "./indexerToClient";
import { IndexerToDB } from "./indexerToDB";
import { Interlacing } from "./interlacing";
import { PreparedBlock } from "./preparedBlock";
import { compressedTransactionResponseDataSize, uncompressedTransactionResponseDataSize } from "./chain-collector-helpers/augmentTransaction";

/**
 * Indexer class for a blockchain. It connects to a blockchain node through a cachedClient.
 * Indexing means the following:
 * * aggressive reading blocks (headers) from all tips
 * * managing which blocks are confirmed and storing confirmed transactions from those blocks to
 *   the database, as soon as they are confirmed.
 * * front running reading transactions in candidate confirmed blocks using block processor
 *   (which helps prioritizing which block is read)
 * * managing interlaced tables for confirmed transactions (clears old transactions from the database)
 * @category Indexer
 */
@Managed()
export class Indexer {
  chainConfig: ChainConfig;
  config: IndexerConfig;
  chainType: ChainType;
  cachedClient: CachedMccClient;
  logger!: AttLogger;
  dbService: DatabaseService;
  blockProcessorManager: BlockProcessorManager;

  indexerToClient: IndexerToClient;

  indexerToDB: IndexerToDB;

  headerCollector: HeaderCollector;

  indexerSync: IndexerSync;

  // N - last processed and saved block
  private _indexedHeight = 0;

  // T - chain height
  tipHeight = 0;

  // stats counter for blocks processed in running session
  processedBlocks = 0;

  // candidate block N + 1 hash (usually on main fork)
  nextBlockHash = "";
  // indicates we are waiting for block N + 1 in processing
  waitNextBlock = false;

  preparedBlocks = new Map<number, PreparedBlock[]>();

  // two interlacing table entity classes for confirmed transaction storage
  dbTransactionClasses: IDBTransactionBase[]; //set by prepareTables()
  // entity class for the block table
  dbBlockClass: IDBBlockBase; //set by prepareTables()

  // bottom block in the transaction tables - used to check if we have enough history
  bottomBlockTime = undefined;

  interlace = new Interlacing();

  constructor(config: IndexerConfig, chainName: string, testMode = false) {
    if (!config) return;

    this.config = config;
    this.chainType = MCC.getChainType(chainName);
    this.chainConfig = config.chainConfiguration;

    this.logger = getGlobalLogger();

    this.dbService = new DatabaseService(
      this.logger,
      {
        ...this.config.indexerDatabase,
        synchronize: true,
      },
      "indexer",
      "",
      testMode
    );

    const cachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 20,
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
    this.indexerToClient = new IndexerToClient(this.cachedClient.client);
    this.indexerToDB = new IndexerToDB(this.logger, this.dbService, this.chainType);

    const blockProcessorManagerSetting = {
      validateBlockBeforeProcess: this.chainConfig.validateBlockBeforeProcess,
      validateBlockMaxRetry: this.chainConfig.validateBlockMaxRetry,
      validateBlockWaitMs: this.chainConfig.validateBlockWaitMs,
    };

    this.blockProcessorManager = new BlockProcessorManager(
      this.logger,
      this.cachedClient,
      this.indexerToClient,
      this.interlace,
      blockProcessorManagerSetting,
      this.blockCompleted.bind(this),
      this.blockAlreadyCompleted.bind(this)
    );

    const headerCollectorSettings = {
      blockCollectTimeMs: this.config.blockCollectTimeMs,
      numberOfConfirmations: this.chainConfig.numberOfConfirmations,
      blockCollecting: this.chainConfig.blockCollecting,
    };
    this.headerCollector = new HeaderCollector(this.logger, this.indexedHeight, this.indexerToClient, this.indexerToDB, headerCollectorSettings);

    this.indexerSync = new IndexerSync(this);
  }

  /////////////////////////////////////////////////////////////
  // MCC logging callbacks
  /////////////////////////////////////////////////////////////

  private mccLogging(message: string) {
    //this.logger.info(`MCC ${message}`);
  }

  private mccWarning(message: string) {
    this.logger.warning(`MCC ${message}`);
  }

  private mccException(error: any, message: string) {
    logException(error, message);
  }

  /////////////////////////////////////////////////////////////
  // Update N
  /////////////////////////////////////////////////////////////

  get indexedHeight() {
    return this._indexedHeight;
  }
  set indexedHeight(newN: number) {
    this._indexedHeight = newN;
    this.headerCollector.updateIndexedHeight(newN);
  }

  /////////////////////////////////////////////////////////////
  // misc
  /////////////////////////////////////////////////////////////

  /**
   * Returns number of days for syncing from configurations
   * @returns
   */
  public syncTimeDays(): number {
    // chain syncTimeDays overrides config syncTimeDays
    if (this.chainConfig.syncTimeDays > 0) return this.chainConfig.syncTimeDays;
    return this.config.syncTimeDays;
  }

  /////////////////////////////////////////////////////////////
  // block processor callbacks
  /////////////////////////////////////////////////////////////

  /**
   * Async callback from BlockProcessor on completion of block processing.
   * @param block - processed block entity
   * @param transactions - processed block transaction entities
   * @returns
   */
  public async blockCompleted(block: DBBlockBase, transactions: DBTransactionBase[]): Promise<boolean> {
    this.logger.info(`^Gcompleted ${block.blockNumber}:N+${block.blockNumber - this.indexedHeight} (${transactions.length} transaction(s))`);

    // if we are waiting for block N+1 to be completed - then it is no need to put it into queue but just save it
    const isBlockNext = block.blockNumber == this.indexedHeight + 1 && block.blockHash.toLowerCase() == this.nextBlockHash.toLowerCase();
    if (isBlockNext && this.waitNextBlock) {
      await this.blockSave(block, transactions);
      this.waitNextBlock = false;
      return;
    }

    // queue completed block
    let processors = this.preparedBlocks.get(block.blockNumber);
    if (!processors) {
      processors = [];
      this.preparedBlocks.set(block.blockNumber, processors);
    }
    processors.push(new PreparedBlock(block, transactions));

    // if N+1 is ready (already processed) then begin processing N+2 (we need to be very aggressive with read ahead)
    if (!this.indexerSync.isSyncing) {
      if (isBlockNext) {
        let blockNextNext = await this.indexerToClient.getBlockFromClient(`blockCompleted`, this.indexedHeight + 2);

        if (blockNextNext) {
          // eslint-disable-next-line
          criticalAsync(`blockCompleted(${block.blockNumber}) -> BlockProcessorManager::process exception: `, () =>
            this.blockProcessorManager.process(blockNextNext)
          );
        }
      }
    }

    return true;
  }

  /**
   * Async callback from BlockProcessor in case block processing is triggered after block was already processed.
   * @param block block to be processed
   */
  async blockAlreadyCompleted(block: BlockBase) {
    this.logger.info(`^Galready completed ${block.number}:N+${block.number - this.indexedHeight}`);

    // if N+1 is ready (already processed) then begin processing N+2 (we need to be very aggressive with read ahead)
    const isBlockNext = block.number == this.indexedHeight + 1 && block.stdBlockHash.toLowerCase() == this.nextBlockHash.toLowerCase();

    if (!this.indexerSync.isSyncing) {
      if (isBlockNext) {
        let blockNextNext = await this.indexerToClient.getBlockFromClient(`blockCompleted`, this.indexedHeight + 2);

        if (blockNextNext) {
          // eslint-disable-next-line
          criticalAsync(`blockAlreadyCompleted(${block.number}) -> BlockProcessorManager::process exception: `, () =>
            this.blockProcessorManager.process(blockNextNext)
          );
        }
      }
    }
  }

  /////////////////////////////////////////////////////////////
  // table interlacing prepare and management
  /////////////////////////////////////////////////////////////

  /**
   * Prepares table entities for transactions (interlaced) and block
   */
  public prepareTables() {
    // const chainType = MCC.getChainType(this.chainConfig.name); //Why not use indexer.chainType
    const prepared = prepareIndexerTables(this.chainType);

    this.dbTransactionClasses = prepared.transactionTable;
    this.dbBlockClass = prepared.blockTable;
  }

  /////////////////////////////////////////////////////////////
  // block save
  // - table interlacing
  // - retry for block save (or terminal app on failure)
  /////////////////////////////////////////////////////////////

  /**
   * Saves block and related transaction entities into the database in
   * database transaction safe way with retries.
   * After saving it triggers transaction table interlacing update.
   * @param block block entity to be saved
   * @param transactions block transaction entities to be saved
   * @returns
   */
  public async blockSave(block: DBBlockBase, transactions: DBTransactionBase[]): Promise<boolean> {
    const Np1 = this.indexedHeight + 1;

    if (block.blockNumber !== Np1) {
      failureCallback(`unexpected block number: expected to save blockNumber ${Np1} (but got ${block.blockNumber})`);
      // function exits
      return false;
    }

    this.logger.debug(`start save block N+1=${Np1} (transaction table index ${this.interlace.activeIndex})`);
    const transactionClass = this.interlace.getActiveTransactionWriteTable();

    // fix data
    block.transactions = transactions.length;

    const time0 = Date.now();

    // create transaction and save everything with retry (terminate app on failure)
    await retry(`blockSave N=${Np1}`, async () => {
      await this.dbService.manager.transaction(async (entityManager) => {
        // save state N, T and T_CHECK_TIME
        const stateEntries = [getStateEntry("N", this.chainConfig.name, Np1), getStateEntry("T", this.chainConfig.name, this.tipHeight)];

        // block must be marked as confirmed
        if (transactions.length > 0) {
          // fix transactions class to active interlace transaction class
          const dummy = new transactionClass();
          for (let tx of transactions) {
            Object.setPrototypeOf(tx, Object.getPrototypeOf(dummy));
          }

          await entityManager.save(transactions);
        } else {
          // save dummy transaction to keep transaction table block continuity
          this.logger.debug(`block ${block.blockNumber} no transactions (dummy tx added)`);

          const dummyTx = new transactionClass();

          dummyTx.chainType = this.cachedClient.client.chainType;
          dummyTx.blockNumber = block.blockNumber;
          dummyTx.transactionType = "EMPTY_BLOCK_INDICATOR";

          await entityManager.save(dummyTx);
        }

        await entityManager.save(block);
        await entityManager.save(stateEntries);
      });
      return true;
    });

    // increment N if all is ok
    this.indexedHeight = Np1;

    // if bottom block is undefined then save it (this happens only on clean start or after database reset)
    if (!this.indexerToDB.bottomBlockTime) {
      await this.indexerToDB.saveBottomState((bottomBlockNumber) => this.headerCollector.onUpdateBottomBlockNumber(bottomBlockNumber));
    }

    this.blockProcessorManager.clearProcessorsUpToBlockNumber(Np1);
    const time1 = Date.now();
    this.logger.info(
      `^g^Wsave completed - next N=${Np1}^^ (${transactions.length} transaction(s), time=${round(time1 - time0, 2)}ms) ^g^W[compression ${round(
        uncompressedTransactionResponseDataSize / (1024 * 1024),
        1
      )}MB -> ${round(compressedTransactionResponseDataSize / (1024 * 1024), 1)}MB ${round(
        (compressedTransactionResponseDataSize * 100) / uncompressedTransactionResponseDataSize,
        1
      )}%]^^`
    );

    // table interlacing
    if (await this.interlace.update(block.timestamp, block.blockNumber)) {
      // bottom state was changed because one table was dropped - we need to save new value
      await this.indexerToDB.saveBottomState((bottomBlockNumber) => this.headerCollector.onUpdateBottomBlockNumber(bottomBlockNumber));
      await this.checkDatabaseContinuous();
    }

    return true;
  }

  /////////////////////////////////////////////////////////////
  // Block saving management
  /////////////////////////////////////////////////////////////

  /**
   * Tries to save block N + 1 with latest hash `blockNp1hash`
   * - If the block is already processed it is saved immediately.
   * - If the block is in processor it waits for completion
   * - Otherwise, it exits and returns false.
   * Assumptions
   * - Block N+1 is confirmed.
   * @returns true: block was successfully saved, false otherwise.
   * NOTE: in real time processing the last option would happen in case
   * of reorg on N + 1, which should be unlikely
   */
  public async trySaveNextBlock(): Promise<boolean> {
    const nextBlockHeight = this.indexedHeight + 1;

    // check if N+1 with blockNp1hash is already prepared (otherwise wait for it)
    const preparedBlocks = this.preparedBlocks.get(nextBlockHeight);
    if (preparedBlocks) {
      for (const preparedBlock of preparedBlocks) {
        if (preparedBlock.block.blockHash.toLowerCase() === this.nextBlockHash.toLowerCase()) {
          // save prepared N+1 block with active hash and increment this.N
          await this.blockSave(preparedBlock.block, preparedBlock.transactions);

          // The assumption is that other blocks are invalid (orphaned) blocks
          this.preparedBlocks.delete(nextBlockHeight);

          return true;
        }
      }
    }

    // check if the block with number N + 1, `Np1`, with hash `Np1Hash` is in preparation
    let exists = false;
    for (const processor of this.blockProcessorManager.blockProcessors) {
      if (processor.block.number == nextBlockHeight && processor.block.stdBlockHash.toLowerCase() == this.nextBlockHash.toLowerCase()) {
        exists = true;
        break;
      }
    }

    if (!exists) {
      this.logger.error2(`N+1 (${nextBlockHeight}) block not in processor`);
      // False is returned to indicate that further waiting needs to be done, recheck this at later time
      return false;
    }

    // wait until N+1 block is saved (blockCompleted will save it immediately)
    this.waitNextBlock = true;
    let timeStart = Date.now();
    this.logger.debug(`^Gwaiting for block N=${nextBlockHeight}`);

    while (this.waitNextBlock) {
      await sleepMs(100);

      // If block processing takes more than 5 seconds we start to log warnings every 5 seconds
      if (Date.now() - timeStart > 5000) {
        this.logger.warning(`saveOrWaitNp1Block timeout`);
        timeStart = Date.now();
      }
    }

    return true;
  }

  /////////////////////////////////////////////////////////////
  // Auxillary functions
  /////////////////////////////////////////////////////////////

  /**
   * Processes command line parameters when supplied.
   * If true is returned, utility functionalities are performed.
   * Otherwise indexer is started.
   */
  async processCommandLineParameters(args: any) {
    // Utility: Forces N in the database (overwrites)
    if (args.setn !== 0) {
      let n = args.setn;

      if (args.setn < 0) {
        const t = await this.indexerToClient.getBlockHeightFromClient(`runIndexer2`);

        this.logger.error2(`force set N to T - ${-n}=${t}`);

        n = t + n;
      } else {
        this.logger.error2("force set N to ");
      }

      const stateEntry = getStateEntry("N", this.chainConfig.name, n);

      await this.dbService.manager.save(stateEntry);
    }

    // Utility: checks if reset all databases is requested
    if (args.reset === "RESET_COMPLETE") {
      this.logger.error2("command: RESET_COMPLETE");

      await this.indexerToDB.dropTable(`state`);

      // Be careful when adding chains
      for (const chainName of SUPPORTED_CHAINS) {
        await this.indexerToDB.dropAllChainTables(chainName);
      }

      this.logger.info("completed - exiting");

      // stop app
      return true;
    }

    // check if reset active database is requested
    if (args.reset === "RESET_ACTIVE") {
      this.logger.error2("command: RESET_ACTIVE");

      // reset state for this chain
      await this.indexerToDB.dropAllStateInfo();

      await this.indexerToDB.dropAllChainTables(this.chainConfig.name);

      this.logger.info("completed - exiting");

      // stop app
      return true;
    }

    // continue running
    return false;
  }

  /**
   * Reset indexer database and stop running.
   * @param reason Reason for stopping.
   */
  public async resetDatabaseAndStop(reason: string) {
    this.logger.error(reason);

    await this.interlace.resetAll();
    await this.indexerToDB.dropAllStateInfo();

    this.logger.debug(`manual restart required`);
    await this.waitForever();
    exit(3);
  }

  /**
   * Updates the status for monitoring
   * @param blockNp1 N + 1 block candidate
   */
  private async updateStatus(blockNp1: BlockBase) {
    const NisReady = this.indexedHeight >= this.tipHeight - this.chainConfig.numberOfConfirmations - 2;
    const syncTimeSec = this.syncTimeDays() * SECONDS_PER_DAY;
    const fullHistory = !this.indexerToDB.bottomBlockTime ? false : blockNp1.unixTimestamp - this.indexerToDB.bottomBlockTime > syncTimeSec;
    let dbStatus;
    if (!fullHistory) {
      let min = Math.ceil((syncTimeSec - (blockNp1.unixTimestamp - this.indexerToDB.bottomBlockTime)) / 60);
      let hr = 0;
      if (min > 90) {
        hr = Math.floor(min / 60);
        min -= hr * 60;
      }

      dbStatus = getStateEntryString(
        "state",
        this.chainConfig.name,
        "running-sync",
        this.processedBlocks,
        `N=${this.indexedHeight} T=${this.tipHeight} (missing ${hr < 0 ? `${min} min` : `${hr}:${String(min).padStart(2, "0")}`})`
      );
    } else if (!NisReady) {
      dbStatus = getStateEntryString(
        "state",
        this.chainConfig.name,
        "running-sync",
        this.processedBlocks,
        `N=${this.indexedHeight} T=${this.tipHeight} (N is late: < T-${this.chainConfig.numberOfConfirmations})`
      );
    } else {
      dbStatus = getStateEntryString("state", this.chainConfig.name, "running", this.processedBlocks, `N=${this.indexedHeight} T=${this.tipHeight}`);
    }
    this.processedBlocks++;
    await retry(`runIndexer::saveStatus`, async () => await this.dbService.manager.save(dbStatus));
    this.logger.info(`Updated status, tipHeight: ${this.tipHeight}`);
  }

  /**
   * Wait for node to be synced.
   * @returns true is function was waiting.
   */
  async waitForNodeSynced() {
    let waiting = false;

    while (true) {
      const status = await this.cachedClient.client.getNodeStatus();
      if (this.chainType == ChainType.XRP) {
        this.logger.info(`Completed ledgers: ${status.data.result.state.complete_ledgers}`);
      }

      if (status.isSynced) {
        if (waiting) {
          this.logger.info(`node is now synced`);
        }
        return waiting;
      }

      if (!waiting) {
        // update state
        const dbStatus = getStateEntryString("state", this.chainConfig.name, "waiting", 0, "waiting for node to be synced");
        await retry(`runIndexer::saveStatus`, async () => await this.dbService.manager.save(dbStatus));
      }

      waiting = true;

      this.logger.info(`waiting for node to be synced...`);
      await sleepMs(1000);
    }
  }

  /**
   * check if indexer database is continuous
   */

  async waitForever() {
    this.logger.error2("waiting forever");
    while (true) {
      await sleepMs(60000);

      this.logger.debug("waiting forever");
    }
  }

  async checkDatabaseContinuous() {
    try {
      const name = this.chainConfig.name.toLowerCase();

      // reference sql query
      //const sqlQuery = `SELECT max(blockNumber) - min(blockNumber) + 1 - count( distinct blockNumber ) as missed FROM indexer.${name}_transactions0 where blockNumber >= (select valueNumber from indexer.state where \`name\` = "${name.toUpperCase()}_Nbottom");`;

      // get DB N_bottom
      const queryNbottom = this.dbService.manager.createQueryBuilder(DBState, "s").where("s.name = :name", { name: `${name.toLowerCase()}_Nbottom` });

      //this.queryPrint(queryNbottom);

      const Nbottom = await queryNbottom.getOne();

      if (!Nbottom || !Nbottom.valueNumber) {
        this.logger.error(`${name} discontinuity test canceled (unable to get state:${name.toLowerCase()}_Nbottom)`);
        return;
      }

      const queryTable0 = this.dbService.manager
        .createQueryBuilder(this.dbTransactionClasses[0] as any as EntityTarget<unknown>, "tx")
        .select('max("blockNumber") - min("blockNumber") + 1 - count( distinct "blockNumber" )', "missing")
        .where('"blockNumber" >= :Nbottom', { Nbottom: Nbottom.valueNumber });

      const queryTable1 = this.dbService.manager
        .createQueryBuilder(this.dbTransactionClasses[1] as any as EntityTarget<unknown>, "tx")
        .select('max("blockNumber") - min("blockNumber") + 1 - count( distinct "blockNumber" )', "missing")
        .where('"blockNumber" >= :Nbottom', { Nbottom: Nbottom.valueNumber });

      const table0missing = await queryTable0.getRawOne();
      const table1missing = await queryTable1.getRawOne();

      if (table0missing && table0missing.missing) {
        if (table0missing.missing != 0) {
          await this.resetDatabaseAndStop(`${name} discontinuity detected (missed ${table0missing.missing} blocks in [0])`);
        } else {
          this.logger.debug(`${name} continuity ok on [0]`);
        }
      }

      if (table1missing && table1missing.missing) {
        if (table1missing.missing != 0) {
          await this.resetDatabaseAndStop(`${name} discontinuity detected (missed ${table1missing.missing} blocks in [1])`);
        } else {
          this.logger.debug(`${name} continuity ok on [1]`);
        }
      }
    } catch (error) {
      logException(error, "checkDatabaseContinuous");
    }
  }

  /////////////////////////////////////////////////////////////
  // main indexer entry function
  /////////////////////////////////////////////////////////////

  runContinuosContinuityTest() {
    setInterval(async () => {
      await this.checkDatabaseContinuous();
    }, 60 * 1000);
  }

  async runIndexer(args: any) {
    // setup tracing
    //traceManager.displayRuntimeTrace = true;
    //TraceManager.enabled = false;
    //traceManager.displayStateOnException = false;

    // ------- 0. Initialization ------------------------------
    // wait for db to connect
    await this.dbService.connect();

    if (await this.processCommandLineParameters(args)) {
      // some parameter settings do not require running indexer
      return;
    }

    await this.waitForNodeSynced();

    // this.prepareTables();

    await this.indexerToDB.saveBottomState((bottomBlockNumber) => this.headerCollector.onUpdateBottomBlockNumber(bottomBlockNumber));

    const startBlockNumber = (await this.indexerToClient.getBlockHeightFromClient(`runIndexer1`)) - this.chainConfig.numberOfConfirmations;

    this.logger.warning(`${this.chainConfig.name} T=${startBlockNumber}`);

    // initial N initialization - will be later on assigned to DB or sync N
    this.indexedHeight = startBlockNumber;

    // N is last completed block - confirmed and stored in DB
    const dbLastDBBlockNumber = await this.indexerToDB.getIndexedHeightFromDB();
    if (dbLastDBBlockNumber > 0) {
      this.indexedHeight = dbLastDBBlockNumber;
    }

    await this.interlace.initialize(
      this.logger,
      this.dbService,
      this.chainType,
      this.chainConfig.minimalStorageHistoryDays,
      this.chainConfig.minimalStorageHistoryBlocks
    );
    this.dbBlockClass = this.interlace.DBBlockClass;
    this.dbTransactionClasses = this.interlace.DBTransactionClasses;

    // check if indexer database is contiguous
    await this.checkDatabaseContinuous();

    // ------- 1. sync blocks from the past ------------------
    await this.indexerSync.runSync(dbLastDBBlockNumber);

    // ------- 2. Run header collection ----------------------
    // eslint-disable-next-line
    criticalAsync("runBlockHeaderCollecting", async () => this.headerCollector.runBlockHeaderCollecting());

    // ------- 3. Run Continuos Continuity Test --------------
    this.runContinuosContinuityTest();

    // ------- 4. Process real time blocks N + 1 -------------

    while (true) {
      // get chain top block
      this.tipHeight = await this.indexerToClient.getBlockHeightFromClient(`runIndexer2`);

      //get next block from what is considered to be the main branch
      let blockNext = await this.indexerToClient.getBlockFromClient(`runIndexer2`, this.indexedHeight + 1);

      if (!blockNext || !blockNext.stdBlockHash) {
        await sleepMs(this.config.blockCollectTimeMs);
        continue;
      }

      // has N+1 confirmation block
      const isNextBlockConfirmed = this.indexedHeight <= this.tipHeight - this.chainConfig.numberOfConfirmations;
      const isNextBlockHashChanged = this.nextBlockHash.toLowerCase() !== blockNext.stdBlockHash.toLowerCase();

      // update status for logging
      await this.updateStatus(blockNext);

      // check if N + 1 hash is the same
      if (!isNextBlockConfirmed && !isNextBlockHashChanged) {
        this.logger.info(`Next block is not confirmed but it has not changed, blockNumber:${this.indexedHeight + 1}`);
        //next block is not confirmed but it has not changed
        await sleepMs(this.config.blockCollectTimeMs);
        continue;
      }

      this.logger.info(`^Wnew block T=${this.tipHeight} N=${this.indexedHeight} ${isNextBlockHashChanged ? "(N+1 hash changed)" : ""}`);

      // set the hash of N + 1 block to the latest known value
      this.nextBlockHash = blockNext.stdBlockHash.toLowerCase();

      // save completed N+1 block or wait for it
      if (isNextBlockConfirmed) {
        // Since we are working async, saves the block N + 1 if it is in processing or it is already processed
        // otherwise it passes through and the correct N + 1-th block will
        // be put in processing (see below)
        await this.trySaveNextBlock();

        // whether N + 1 was saved or not it is always better to refresh the block N + 1
        blockNext = await this.indexerToClient.getBlockFromClient(`runIndexer3`, this.indexedHeight + 1);
        if (!blockNext || !blockNext.stdBlockHash) {
          continue; //This should never happen if numberOfConfirmations is more than 1.
        }
        // process new or changed N+1
        this.nextBlockHash = blockNext.stdBlockHash.toLowerCase();
      }

      // start async processing of block N + 1 (if not already started)
      // eslint-disable-next-line
      criticalAsync(`runIndexer -> BlockProcessorManager::process exception: `, () => this.blockProcessorManager.process(blockNext));
    }
  }
}
