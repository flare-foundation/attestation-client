import { ChainType, IBlock, IBlockHeader, Managed, MCC } from "@flarenetwork/mcc";
import { exit } from "process";
import { EntityTarget } from "typeorm";
import { CachedMccClient, CachedMccClientOptions } from "../caching/CachedMccClient";
import { ChainConfiguration, ChainsConfiguration } from "../chain/ChainConfiguration";
import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DBState } from "../entity/indexer/dbState";
import { DBTransactionBase } from "../entity/indexer/dbTransaction";
import { DatabaseService } from "../utils/databaseService";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { failureCallback, retry } from "../utils/PromiseTimeout";
import { getUnixEpochTimestamp, round, sleepms } from "../utils/utils";
import { BlockProcessorManager } from "./blockProcessorManager";
import { HeaderCollector } from "./headerCollector";
import { criticalAsync, prepareIndexerTables, SECONDS_PER_DAY, SUPPORTED_CHAINS } from "./indexer-utils";
import { IndexerConfiguration, IndexerCredentials } from "./IndexerConfiguration";
import { IndexerSync } from "./indexerSync";
import { Interlacing } from "./interlacing";
import { PreparedBlock } from "./preparedBlock";

/**
 * Indexer class for a blockchain. It connects to a blockchain node through a cachedClient.
 * Indexing means the following:
 * * agressive reading blocks (headers) from all tips
 * * managing which blocks are confirmed and storing confirmed transactions from those blocks to
 *   the database, as soon as they are confirmed.
 * * front running reading transactions in candidate confirmed blocks using block processor
 *   (which helps prioritizing which block is read)
 * * managing interlaced tables for confirmed transactions (clears old transactions from the database)
 * @category Indexer
 */
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

  indexerSync: IndexerSync;

  // N - last processed and saved block
  N = 0;

  // T - chain height
  T = 0;

  // stats counter for blocks processed in running session
  processedBlocks = 0;

  // candidate block N + 1 hash (usually on main fork)
  blockNp1hash = "";
  // indicates we are waiting for block N + 1 in processing
  waitNp1 = false;

  preparedBlocks = new Map<number, PreparedBlock[]>();

  // two interlacing table entity classes for confirmed transaction storage
  dbTransactionClasses: DBTransactionBase[];
  // entity class for the block table
  dbBlockClass;

  // bottom block in the transaction tables - used to check if we have enough history
  bottomBlockTime = undefined;

  interlace = new Interlacing();

  constructor(config: IndexerConfiguration, chainsConfig: ChainsConfiguration, credentials: IndexerCredentials, chainName: string) {
    if (!config) return;

    this.config = config;
    this.credentials = credentials;
    this.chainType = MCC.getChainType(chainName);
    this.chainConfig = chainsConfig.chains.find((el) => el.name === chainName)!;

    this.logger = getGlobalLogger();

    this.dbService = new DatabaseService(this.logger, this.credentials.indexerDatabase, "indexer");

    const cachedMccClientOptions: CachedMccClientOptions = {
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

    this.blockProcessorManager = new BlockProcessorManager(this, this.blockCompleted.bind(this), this.blockAlreadyCompleted.bind(this));

    this.headerCollector = new HeaderCollector(this.logger, this);

    this.indexerSync = new IndexerSync(this);
  }

  /////////////////////////////////////////////////////////////
  // MCC logging callbacks
  /////////////////////////////////////////////////////////////

  private mccLogging(message: string) {
    // todo: add MCC logging verbose option
    //this.logger.info(`MCC ${message}`);
  }

  private mccWarning(message: string) {
    this.logger.warning(`MCC ${message}`);
  }

  private mccException(error: any, message: string) {
    logException(error, message);
  }

  /////////////////////////////////////////////////////////////
  // Safeguarded client functions
  /////////////////////////////////////////////////////////////

  /**
   *
   * @param label
   * @param blockNumber
   * @returns
   * @category BaseMethod
   */
  public async getBlockFromClient(label: string, blockNumber: number): Promise<IBlock> {
    // todo: implement MCC lite version of getBlock
    const result = await retry(`indexer.getBlockFromClient.${label}`, async () => {
      return await this.cachedClient.client.getBlock(blockNumber);
    });
    if (!result) {
      failureCallback(`indexer.getBlockFromClient.${label} - null block returned`);
    }
    return result;
  }

  /**
   *
   * @param label
   * @param blockHash
   * @returns
   * @category BaseMethod
   */
  public async getBlockFromClientByHash(label: string, blockHash: string): Promise<IBlock> {
    // todo: implement MCC lite version of getBlock
    const result = await retry(`indexer.getBlockFromClientByHash.${label}`, async () => {
      return await this.cachedClient.client.getBlock(blockHash);
    });
    if (!result) {
      failureCallback(`indexer.getBlockFromClientByHash.${label} - null block returned`);
    }
    return result;
  }

  /**
   *
   * @param label
   * @param blockHash
   * @returns
   * @category BaseMethod
   */
  public async getBlockHeaderFromClientByHash(label: string, blockHash: string): Promise<IBlockHeader> {
    // todo: implement MCC lite version of getBlock
    const result = await retry(`indexer.getBlockHeaderFromClientByHash.${label}`, async () => {
      return await this.cachedClient.client.getBlockHeader(blockHash);
    });
    if (!result) {
      failureCallback(`indexer.getBlockHeaderFromClientByHash.${label} - null block returned`);
    }
    return result;
  }

  public async getBlockHeightFromClient(label: string): Promise<number> {
    return await retry(`indexer.getBlockHeightFromClient.${label}`, async () => {
      return this.cachedClient.client.getBlockHeight();
    });
  }

  public async getBottomBlockHeightFromClient(label: string): Promise<number> {
    return await retry(`indexer.getBottomBlockHeightFromClient.${label}`, async () => {
      return this.cachedClient.client.getBottomBlockHeight();
    });
  }

  /**
   *
   * @param blockNumber
   * @returns
   * @category AdvancedMethod
   */
  public async getBlockNumberTimestampFromClient(blockNumber: number): Promise<number> {
    // todo: get `getBlockLite` FAST version of block read since we only need timestamp
    const block = (await this.getBlockFromClient(`getBlockNumberTimestampFromClient`, blockNumber)) as IBlock;
    // block cannot be undefined as the above call will fatally fail and terminate app
    return block.unixTimestamp;
  }

  /////////////////////////////////////////////////////////////
  // misc
  /////////////////////////////////////////////////////////////

  /**
   * Prefixes chain name and undercore to the given name
   * @param name chain name
   * @returns
   */
  private prefixChainNameTo(name: string) {
    return this.chainConfig.name + "_" + name;
  }

  /**
   * Returns entry key for N in the database.
   * @returns
   */
  private getChainN() {
    return this.prefixChainNameTo("N");
  }

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
  // state recording functions
  /////////////////////////////////////////////////////////////

  /**
   * Constructs dbState entity for key-value pair
   * @param name name associated to key
   * @param value value (number)
   * @returns
   */
  public getStateEntry(name: string, value: number): DBState {
    const state = new DBState();

    state.name = this.prefixChainNameTo(name);
    state.valueNumber = value;
    state.timestamp = getUnixEpochTimestamp();

    return state;
  }

  /**
   * Construct dbState entity for key-values entry, that contains string, number and comment values.
   * @param name
   * @param valueString
   * @param valueNum
   * @param comment
   * @returns
   */
  public getStateEntryString(name: string, valueString: string, valueNum: number, comment = ""): DBState {
    const state = new DBState();

    state.name = this.prefixChainNameTo(name);
    state.valueString = valueString;
    state.valueNumber = valueNum;
    state.timestamp = getUnixEpochTimestamp();
    state.comment = comment;

    return state;
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
    this.logger.info(`^Gcompleted ${block.blockNumber}:N+${block.blockNumber - this.N} (${transactions.length} transaction(s))`);

    // if we are waiting for block N+1 to be completed - then it is no need to put it into queue but just save it
    const isBlockNp1 = block.blockNumber == this.N + 1 && block.blockHash == this.blockNp1hash;
    if (isBlockNp1 && this.waitNp1) {
      await this.blockSave(block, transactions);
      this.waitNp1 = false;
      return;
    }

    // queue completed block
    let processors = this.preparedBlocks.get(block.blockNumber);
    if (!processors) {
      processors = [];
      this.preparedBlocks.set(block.blockNumber, processors);
    }
    processors.push(new PreparedBlock(block, transactions));

    // todo: this causes async growing - this should be queued and run from main async
    // if N+1 is ready (already processed) then begin processing N+2 (we need to be very aggressive with read ahead)
    if (!this.indexerSync.isSyncing) {
      if (isBlockNp1) {
        const blockNp2 = await this.getBlockFromClient(`blockCompleted`, this.N + 2);
        // eslint-disable-next-line
        criticalAsync(`blockCompleted(${block.blockNumber}) -> BlockProcessorManager::process exception: `, () => this.blockProcessorManager.process(blockNp2));
      }
    }

    return true;
  }

  /**
   * Async callback from BlockProcessor in case block processing is triggered after block was already processed.
   * @param block block to be processed
   */
  async blockAlreadyCompleted(block: IBlock) {
    this.logger.info(`^Galready completed ${block.number}:N+${block.number - this.N}`);

    // todo: this causes asycn growing - this should be queued and run from main async
    // if N+1 is ready (already processed) then begin processing N+2 (we need to be very aggressive with read ahead)
    const isBlockNp1 = block.number == this.N + 1 && block.stdBlockHash == this.blockNp1hash;

    if (!this.indexerSync.isSyncing) {
      if (isBlockNp1) {
        const blockNp2 = await this.getBlockFromClient(`blockAlreadyCompleted`, this.N + 2);
        // eslint-disable-next-line
        criticalAsync(`blockAlreadyCompleted(${block.number}) -> BlockProcessorManager::process exception: `, () => this.blockProcessorManager.process(blockNp2));
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
    const chainType = MCC.getChainType(this.chainConfig.name);
    const prepared = prepareIndexerTables(chainType);

    this.dbTransactionClasses = prepared.transactionTable;
    this.dbBlockClass = prepared.blockTable;
  }

  /**
   * Returns current active transaction table managed by interlacing
   * @returns
   */
  public getActiveTransactionWriteTable(): DBTransactionBase {
    // we write into table by active index:
    //  0 - table0
    //  1 - table1

    const index = this.interlace.getActiveIndex();

    return this.dbTransactionClasses[index];
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
    const Np1 = this.N + 1;

    if (block.blockNumber !== Np1) {
      failureCallback(`unexpected block number: expected to save blockNumber ${Np1} (but got ${block.blockNumber})`);
      // function exits
      return false;
    }

    this.logger.debug(`start save block N+1=${Np1} (transaction table index ${this.interlace.getActiveIndex()})`);
    const transactionClass = this.getActiveTransactionWriteTable() as any;

    // fix data
    block.transactions = transactions.length;

    const time0 = Date.now();

    // create transaction and save everything with retry (terminate app on failure)
    await retry(`blockSave N=${Np1}`, async () => {
      await this.dbService.connection.transaction(async (transaction) => {
        // save state N, T and T_CHECK_TIME
        const stateEntries = [this.getStateEntry("N", Np1), this.getStateEntry("T", this.T)];

        // block must be marked as confirmed
        if (transactions.length > 0) {

          // let newTransactions = [];

          // for( const tx of transactions ) {
          //   const newTx = new transactionClass();

          //   newTx.chainType=tx.chainType;
          //   newTx.transactionId=tx.transactionId;
          //   newTx.blockNumber=tx.blockNumber;
          //   newTx.timestamp=tx.timestamp;
          //   newTx.paymentReference=tx.paymentReference;
          //   newTx.response=tx.response;
          //   newTx.isNativePayment=tx.isNativePayment;
          //   newTx.transactionType=tx.transactionType;

          //   newTransactions.push( newTx );
          // }

          // await transaction.save(newTransactions);

          // fix transactions class to active interlace tranascation class
          const dummy = new transactionClass();
          for (let transaction of transactions) {
            Object.setPrototypeOf(transaction, Object.getPrototypeOf(dummy));
          }

          await transaction.save(transactions);
        }
        else {
          // save dummy transaction to keep transaction table block continuity
          this.logger.debug(`block ${block.blockNumber} no transactions (dummy tx added)`);

          const dummyTx = new transactionClass();

          dummyTx.chainType = this.cachedClient.client.chainType;
          dummyTx.blockNumber = block.blockNumber;
          dummyTx.transactionType = "EMPTY_BLOCK_INDICATOR";

          await transaction.save(dummyTx);
        }

        await transaction.save(block);
        await transaction.save(stateEntries);
      });
      return true;
    });

    // increment N if all is ok
    this.N = Np1;

    // if bottom block is undefined then save it (this happens only on clean start or after database reset)
    if (!this.bottomBlockTime) {
      await this.saveBottomState();
    }

    this.blockProcessorManager.clearProcessorsUpToBlockNumber(Np1);
    const time1 = Date.now();
    this.logger.info(`^g^Wsave completed - next N=${Np1}^^ (${transactions.length} transaction(s), time=${round(time1 - time0, 2)}ms)`);

    // table interlacing
    if (await this.interlace.update(block.timestamp, block.blockNumber)) {
      // bottom state was changed because one table was dropped - we need to save new value
      await this.saveBottomState();

      await this.checkDatabaseContinuous()
    }

    return true;
  }

  /////////////////////////////////////////////////////////////
  // Save bottom N state (used for verification)
  /////////////////////////////////////////////////////////////

  /**
   * Saves the bottom block number and timestamp into the state table in the database.
   * The bottom block is the minimal block for confirmed transactions that are currently
   * stored in the interlacing transaction tables.
   */
  async saveBottomState() {
    try {
      const bottomBlockNumber = await this.getBottomDBBlockNumberFromStoredTransactions();
      if (bottomBlockNumber) {
        const bottomBlock = await this.dbService.manager.findOne(this.dbBlockClass, { where: { blockNumber: bottomBlockNumber, confirmed: true } });

        this.bottomBlockTime = (bottomBlock as DBBlockBase).timestamp;

        this.logger.debug(`block bottom state ${bottomBlockNumber}`);
        const bottomStates = [this.getStateEntry(`Nbottom`, bottomBlockNumber), this.getStateEntry(`NbottomTime`, this.bottomBlockTime)];
        await this.dbService.manager.save(bottomStates);
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

  /**
   * @returns Returns last N saved into the database
   */
  private async getNfromDB(): Promise<number> {
    const res = await this.dbService.manager.findOne(DBState, { where: { name: this.getChainN() } });

    if (res === undefined || res === null) return 0;

    return res.valueNumber;
  }

  /**
   * Finds minimal block number that appears in interlacing transaction tables
   * @returns
   * NOTE: we assume there is no gaps
   */
  public async getBottomDBBlockNumberFromStoredTransactions(): Promise<number> {
    const query0 = this.dbService.manager.createQueryBuilder(this.dbTransactionClasses[0] as any, "blocks");
    query0.select(`MIN(blocks.blockNumber)`, "min");
    const result0 = await query0.getRawOne();

    const query1 = this.dbService.manager.createQueryBuilder(this.dbTransactionClasses[1] as any, "blocks");
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
  public async trySaveNp1Block(): Promise<boolean> {
    const Np1 = this.N + 1;

    // check if N+1 with blockNp1hash is already prepared (otherwise wait for it)
    const preparedBlocks = this.preparedBlocks.get(Np1);
    if (preparedBlocks) {
      for (const preparedBlock of preparedBlocks) {
        if (preparedBlock.block.blockHash === this.blockNp1hash) {
          // save prepared N+1 block with active hash and increment this.N
          await this.blockSave(preparedBlock.block, preparedBlock.transactions);

          // The assumption is that other blocks are invalid (orphaned) blocks
          this.preparedBlocks.delete(Np1);

          return true;
        }
      }
    }

    // check if the block with number N + 1, `Np1`, with hash `Np1Hash` is in preparation
    let exists = false;
    for (const processor of this.blockProcessorManager.blockProcessors) {
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
    let timeStart = Date.now();
    this.logger.debug(`^Gwaiting for block N=${Np1}`);

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
  // Auxillary functions
  /////////////////////////////////////////////////////////////

  async dropAllStateInfo() {
    this.logger.info(`drop all state info for '${this.chainConfig.name}'`);

    await this.dbService.manager.createQueryBuilder()
      .delete()
      .from(DBState)
      .where("`name` like :name", { name: `%${this.chainConfig.name}_%` })
      .execute();
  }

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
        const t = await this.getBlockHeightFromClient(`runIndexer2`);

        this.logger.error2(`force set N to T - ${-n}=${t}`);

        n = t + n;
      } else {
        this.logger.error2("force set N to ");
      }

      const stateEntry = this.getStateEntry("N", n);

      await this.dbService.manager.save(stateEntry);
    }

    // Utility: checks if reset all databases is requested
    if (args.reset === "RESET_COMPLETE") {
      this.logger.error2("command: RESET_COMPLETE");

      await this.dropTable(`state`);

      // Be careful when adding chains
      for (const chainName of SUPPORTED_CHAINS) {
        await this.dropAllChainTables(chainName);
      }

      this.logger.info("completed - exiting");

      // stop app
      return true;
    }

    // check if reset active database is requested
    if (args.reset === "RESET_ACTIVE") {
      this.logger.error2("command: RESET_ACTIVE");

      // reset state for this chain
      await this.dropAllStateInfo();

      await this.dropAllChainTables(this.chainConfig.name);

      this.logger.info("completed - exiting");

      // stop app
      return true;
    }

    // continue running
    return false;
  }

  /**
   * Securely drops the table given the name
   * @param name name of the table to be dropped
   * @returns
   */
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

  /**
   * Drops all block and transactions tables for the specified chain
   * @param chain chain name (XRP, LTC, BTC, DOGE, ALGO)
   */
  private async dropAllChainTables(chain: string) {
    chain = chain.toLocaleLowerCase();

    await this.dropTable(`${chain}_block`);
    await this.dropTable(`${chain}_transactions0`);
    await this.dropTable(`${chain}_transactions1`);
  }

  /**
   * Updates the status for monitoring
   * @param blockNp1 N + 1 block candidate
   */
  private async updateStatus(blockNp1: IBlock) {
    const NisReady = this.N >= this.T - this.chainConfig.numberOfConfirmations - 2;
    const syncTimeSec = this.syncTimeDays() * SECONDS_PER_DAY;
    const fullHistory = !this.bottomBlockTime ? false : blockNp1.unixTimestamp - this.bottomBlockTime > syncTimeSec;
    let dbStatus;
    if (!fullHistory) {
      let min = Math.ceil((syncTimeSec - (blockNp1.unixTimestamp - this.bottomBlockTime)) / 60);
      let hr = 0;
      if (min > 90) {
        hr = Math.floor(min / 60);
        min -= hr * 60;
      }

      dbStatus = this.getStateEntryString(
        "state",
        "running-sync",
        this.processedBlocks,
        `N=${this.N} T=${this.T} (missing ${(hr < 0 ? `${min} min` : `${hr}:${String(min).padStart(2, '0')}`)})`
      );
    } else if (!NisReady) {
      dbStatus = this.getStateEntryString(
        "state",
        "running-sync",
        this.processedBlocks,
        `N=${this.N} T=${this.T} (N is late: < T-${this.chainConfig.numberOfConfirmations})`
      );
    } else {
      dbStatus = this.getStateEntryString("state", "running", this.processedBlocks, `N=${this.N} T=${this.T}`);
    }
    this.processedBlocks++;
    await retry(`runIndexer::saveStatus`, async () => await this.dbService.manager.save(dbStatus));
  }

  /**
   * Wait for node to be synced.
   * @returns true is function was waiting.
   */
  async waitForNodeSynced() {
    let waiting = false;

    while (true) {
      const status = await this.cachedClient.client.getNodeStatus();

      if (status.isSynced) {
        if (waiting) {
          this.logger.info(`node is now synced`);
        }
        return waiting;
      }

      if (!waiting) {
        // update state
        const dbStatus = this.getStateEntryString("state", "waiting", 0, "waiting for node to be synced");
        await retry(`runIndexer::saveStatus`, async () => await this.dbService.manager.save(dbStatus));
      }

      waiting = true;

      this.logger.info(`waiting for node to be synced...`);
    }
  }

  /**
   * check if indexer database is continous
   */

  async waitForever() {
    this.logger.error2("waiting forever");
    while (true) {
      await sleepms(60000);

      this.logger.debug("waiting forever")
    }
  }

  async checkDatabaseContinuous() {

    try {
      const name = this.chainConfig.name.toLowerCase();

      // reference sql query
      //const sqlQuery = `SELECT max(blockNumber) - min(blockNumber) + 1 - count( distinct blockNumber ) as missed FROM indexer.${name}_transactions0 where blockNumber >= (select valueNumber from indexer.state where \`name\` = "${name.toUpperCase()}_Nbottom");`;

      // get DB N_bottom 
      const queryNbottom = this.dbService.manager.createQueryBuilder()
        .select("valueNumber")
        .addSelect("name")
        .from(DBState, "s")
        .where("s.name = :name", { name: `${name.toUpperCase()}_Nbottom` });

      //this.queryPrint(queryNbottom);

      const Nbottom = await queryNbottom.getRawOne();

      if (!Nbottom || !Nbottom.valueNumber) {
        this.logger.error(`${name} discontinuity test failed (unable to get state:${name.toUpperCase()}_Nbottom)`);
        return;
      }

      const queryTable0 = this.dbService.manager.createQueryBuilder()
        .select("max(blockNumber) - min(blockNumber) + 1 - count( distinct blockNumber )", "missing")
        .from(this.dbTransactionClasses[0] as any as EntityTarget<unknown>, "tx")
        .where("blockNumber >= :Nbottom", { Nbottom: Nbottom.valueNumber });

      const queryTable1 = this.dbService.manager.createQueryBuilder()
        .select("max(blockNumber) - min(blockNumber) + 1 - count( distinct blockNumber )", "missing")
        .from(this.dbTransactionClasses[1] as any as EntityTarget<unknown>, "tx")
        .where("blockNumber >= :Nbottom", { Nbottom: Nbottom.valueNumber });

      const table0missing = await queryTable0.getRawOne();
      const table1missing = await queryTable1.getRawOne();

      if (table0missing && table0missing.missing) {
        if (table0missing.missing != 0) {
          this.logger.error(`${name} discontinuity detected (missed ${table0missing.missing} blocks in [0])`);

          //await this.interlace.resetAll();

          this.logger.debug(`restarting`);
          await this.waitForever();
          exit(3);
        }
        else {
          this.logger.debug(`${name} continuity ok on [0]`);
        }
      }

      if (table1missing && table1missing.missing) {
        if (table1missing.missing != 0) {
          this.logger.error(`${name} discontinuity detected (missed ${table1missing.missing} blocks in [1])`);

          await this.interlace.resetAll();

          this.logger.debug(`restarting`);
          await this.waitForever();
          exit(3);
        }
        else {
          this.logger.debug(`${name} continuity ok on [1]`);
        }
      }
    }
    catch (error) {
      logException(error, "checkDatabaseContinuous");
    }
  }

  /////////////////////////////////////////////////////////////
  // main indexer entry function
  /////////////////////////////////////////////////////////////

  runContinuosContinuityTest() {
    setInterval(async () => {
      await this.checkDatabaseContinuous()
    }, 60 * 1000);
  }

  async runIndexer(args: any) {
    // setup tracing
    //traceManager.displayRuntimeTrace = true;
    //TraceManager.enabled = false;
    //traceManager.displayStateOnException = false;

    // ------- 0. Initialization ------------------------------
    // wait for db to connect
    await this.dbService.waitForDBConnection();

    if (await this.processCommandLineParameters(args)) {
      // some parameter settings do not require running indexer
      return;
    }

    await this.waitForNodeSynced();

    this.prepareTables();

    await this.saveBottomState();

    const startBlockNumber = (await this.getBlockHeightFromClient(`runIndexer1`)) - this.chainConfig.numberOfConfirmations;

    this.logger.warning(`${this.chainConfig.name} T=${startBlockNumber}`);

    // initial N initialization - will be later on assigned to DB or sync N
    this.N = startBlockNumber;

    // N is last completed block - confirmed and stored in DB
    const dbStartBlockNumber = await this.getNfromDB();
    if (dbStartBlockNumber > 0) {
      this.N = dbStartBlockNumber;
    }

    await this.interlace.initialize(
      this,
      this.dbService,
      this.dbTransactionClasses,
      this.chainConfig.minimalStorageHistoryDays,
      this.chainConfig.minimalStorageHistoryBlocks,
      this.chainConfig.name
    );

    // check if indexer database is continous
    await this.checkDatabaseContinuous();

    // ------- 1. sync blocks from the past ------------------
    await this.indexerSync.runSync(dbStartBlockNumber);

    // ------- 2. Run header collection ----------------------
    // eslint-disable-next-line
    criticalAsync("runBlockHeaderCollecting", async () => this.headerCollector.runBlockHeaderCollecting());

    // ------- 3. Run Continuos Continuity Test --------------
    this.runContinuosContinuityTest();

    // ------- 4. Process real time blocks N + 1 -------------

    while (true) {
      // get chain top block
      this.T = await this.getBlockHeightFromClient(`runIndexer2`);

      // change getBlock to getBlockHeader
      let blockNp1 = await this.getBlockFromClient(`runIndexer2`, this.N + 1);

      // has N+1 confirmation block
      const isNp1Confirmed = this.N < this.T - this.chainConfig.numberOfConfirmations;
      const isChangedNp1Hash = this.blockNp1hash !== blockNp1.stdBlockHash;

      // update status for logging
      await this.updateStatus(blockNp1);

      // check if N + 1 hash is the same
      if (!isNp1Confirmed && !isChangedNp1Hash) {
        await sleepms(this.config.blockCollectTimeMs);
        continue;
      }

      this.logger.info(`^Wnew block T=${this.T} N=${this.N} ${isChangedNp1Hash ? "(N+1 hash changed)" : ""}`);

      // set the hash of N + 1 block to the latest known value
      this.blockNp1hash = blockNp1.stdBlockHash;

      // save completed N+1 block or wait for it
      if (isNp1Confirmed) {
        // Since we are working async, saves the block N + 1 if it is in processing or it is already processed
        // otherwise it passes through and the correct N + 1-th block will
        // be put in processing (see below)
        await this.trySaveNp1Block();

        // whether N + 1 was saved or not it is always better to refresh the block N + 1
        blockNp1 = await this.getBlockFromClient(`runIndexer3`, this.N + 1);
        // process new or changed N+1
        this.blockNp1hash = blockNp1.stdBlockHash;
      }

      // start async processing of block N + 1 (if not already started)
      // eslint-disable-next-line
      criticalAsync(`runIndexer -> BlockProcessorManager::process exception: `, () => this.blockProcessorManager.process(blockNp1));
    }
  }
}
