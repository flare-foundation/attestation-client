import { ChainType, IBlock, ITransaction, MCC } from "flare-mcc";
import { LiteBlock } from "flare-mcc/dist/base-objects/blocks/LiteBlock";
import { CachedMccClient, CachedMccClientOptions } from "../caching/CachedMccClient";
import { ChainConfiguration, ChainsConfiguration } from "../chain/ChainConfiguration";
import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DBState } from "../entity/indexer/dbState";
import { DBTransactionBase } from "../entity/indexer/dbTransaction";
import { readConfig, readCredentials } from "../utils/config";
import { DatabaseService } from "../utils/databaseService";
import { DotEnvExt } from "../utils/DotEnvExt";
import { getTimeMilli } from "../utils/internetTime";
import { AttLogger, getGlobalLogger, logException, setGlobalLoggerLabel } from "../utils/logger";
import { retry, setRetryFailureCallback } from "../utils/PromiseTimeout";
import { getUnixEpochTimestamp, prepareString, round, secToHHMMSS, sleepms } from "../utils/utils";
import { BlockProcessorManager } from "./blockProcessorManager";
import { HeaderCollector } from "./headerCollector";
import { prepareIndexerTables, SECONDS_PER_DAY } from "./indexer-utils";
import { IndexerConfiguration, IndexerCredentials } from "./IndexerConfiguration";
import { Interlacing } from "./interlacing";

var yargs = require("yargs");

const args = yargs
  .option("drop", { alias: "d", type: "string", description: "Drop databases", default: "", demand: false })
  .option("chain", { alias: "a", type: "string", description: "Chain", default: "ALGO", demand: false }).argv;

class PreparedBlock {
  block: DBBlockBase;
  transactions: DBTransactionBase[];

  constructor(block: DBBlockBase, transactions: DBTransactionBase[]) {
    this.block = block;
    this.transactions = transactions;
  }
}

export class Indexer {
  config: IndexerConfiguration;
  chainsConfig: ChainsConfiguration;
  chainConfig: ChainConfiguration;
  credentials: IndexerCredentials;
  chainType: ChainType;
  cachedClient: CachedMccClient<any, IBlock>;
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

  // statistics
  static sendCount = 0;
  static txCount = 0;
  static valid = 0;
  static invalid = 0;

  dbTransactionClasses;
  dbBlockClass;

  tableLock = false;

  isSyncing = false;

  interlace = new Interlacing();

  constructor(config: IndexerConfiguration, chainsConfig: ChainsConfiguration, credentials: IndexerCredentials, chainName: string) {
    this.config = config;
    this.credentials = credentials;
    this.chainType = MCC.getChainType(chainName);
    this.chainConfig = chainsConfig.chains.find((el) => el.name === chainName)!;

    this.logger = getGlobalLogger();

    this.dbService = new DatabaseService(this.logger, this.credentials.indexerDatabase, "indexer");

    // todo: setup options from config
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
        }
      },
    };

    this.cachedClient = new CachedMccClient<ITransaction, IBlock>(this.chainType, cachedMccClientOptions);

    this.blockProcessorManager = new BlockProcessorManager(this.logger, this.cachedClient, this.blockCompleted.bind(this), this.blockAlreadyCompleted.bind(this),);

    this.headerCollector = new HeaderCollector(this.logger, this);
  }

  mccLogging(message: string) {
    //this.logger.info(`MCC ${message}`);
  }

  mccWarning(message: string) {
    this.logger.warning(`MCC ${message}`);
  }

  mccException(error: any, message: string) {
    logException(error, message);
  }


  async getBlock(label: string, blockNumber: number): Promise<IBlock> {
    // todo: implement lite version
    return await retry(`indexer.getBlock.${label}`, async () => { return await this.cachedClient.client.getBlock(blockNumber); });
  }

  async getBlockHeight(label: string): Promise<number> {
    return await retry(`indexer.getBlockHeight.${label}`, async () => { return this.cachedClient.client.getBlockHeight(); });
  }

  async blockCompleted(block: DBBlockBase, transactions: DBTransactionBase[]): Promise<boolean> {
    this.logger.info(`^Gcompleted ${block.blockNumber}:N+${block.blockNumber - this.N} (${transactions.length} transaction(s))`);

    const isBlockNp1 = block.blockNumber == this.N + 1 && block.blockHash == this.blockNp1hash;

    if (this.waitNp1) {
      if (isBlockNp1) {
        // if we are waiting for block N+1 and this is it then no need to put it into queue but just save it

        await this.blockSave(block, transactions);

        this.waitNp1 = false;

        return;
      }
    }

    // queue it
    let processors = this.preparedBlocks.get(block.blockNumber);
    if (!processors) {
      processors = [];
      this.preparedBlocks.set(block.blockNumber, processors);
    }
    processors.push(new PreparedBlock(block, transactions));

    // if N+1 is ready then begin processing N+2
    if (!this.isSyncing) {
      if (isBlockNp1) {
        const blockNp2 = await this.getBlock(`blockCompleted`, this.N + 2);
        this.blockProcessorManager.process(blockNp2);
      }
    }

    return true;
  }

  async blockAlreadyCompleted(block: IBlock) {
    this.logger.info(`^Galready completed ${block.number}:N+${block.number - this.N}`);
    // if N+1 is ready then begin processing N+2

    const isBlockNp1 = block.number == this.N + 1 && block.stdBlockHash == this.blockNp1hash;

    if (!this.isSyncing) {
      if (isBlockNp1) {
        const blockNp2 = await this.getBlock(`blockAlreadyCompleted`, this.N + 2);
        this.blockProcessorManager.process(blockNp2);
      }
    }
  }


  getChainName(name: string) {
    return this.chainConfig.name + "_" + name;
  }
  getChainN() {
    return this.getChainName("N");
  }

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

  async blockSave(block: DBBlockBase, transactions: DBTransactionBase[]): Promise<boolean> {
    const Np1 = this.N + 1;

    if (block.blockNumber !== Np1) {
      // what now? PANIC
      this.logger.error2(`expected to save blockNumber ${Np1} (but got ${block.blockNumber})`);
      return;
    }

    this.logger.debug(`start save block N+1=${Np1}`);

    try {
      //const epoch = this.getBlockSaveEpoch(block.timestamp);

      //const tableIndex = epoch & 1;

      const change = this.interlace.update(block.timestamp, block.blockNumber);
      const tableIndex = this.interlace.getActiveIndex();

      while (this.tableLock) {
        await sleepms(1);
      }

      // check if tables need to be dropped and new created
      if (change) {
        this.tableLock = true;

        const time0 = Date.now();
        const queryRunner = this.dbService.connection.createQueryRunner();
        const tableName = `${this.chainConfig.name.toLowerCase()}_transactions${tableIndex}`;
        const table = await queryRunner.getTable(tableName);
        await queryRunner.dropTable(table);
        await queryRunner.createTable(table);
        await queryRunner.release();
        const time1 = Date.now();

        this.logger.info(`drop table '${tableName}' (time ${time1 - time0}ms)`);

        this.tableLock = false;
      }

      //this.prevEpoch = epoch;

      const entity = this.dbTransactionClasses[tableIndex];

      // make block copy
      // todo: Luka do that in augmentBlock
      const blockCopy = new this.dbBlockClass();
      for (let key of Object.keys(block)) {
        blockCopy[key] = block[key];
      }

      blockCopy.blockHash = prepareString(blockCopy.blockHash, 128);

      blockCopy.transactions = transactions.length;

      // create transaction and save everything
      const time0 = Date.now();


      retry(`blockSave N=${Np1}`, async () => {
        await this.dbService.connection.transaction(async (transaction) => {
          // save state N, T and T_CHECK_TIME
          const stateEntries = [
            this.getStateEntry("N", Np1),
            this.getStateEntry("T", this.T)];

          // block must be marked as confirmed
          if (transactions.length > 0) {
            await transaction.save(transactions);
          }
          await transaction.save(blockCopy);
          await transaction.save(stateEntries);
        });
        return true;
      });

      // increment N if all is ok
      this.N = Np1;

      this.blockProcessorManager.clear(Np1);
      const time1 = Date.now();
      this.logger.info(`^r^Wsave completed - next N=${Np1}^^ (time=${round(time1 - time0, 2)}ms)`);

    } catch (error) {
      logException(error, `saveInterlaced error (N=${Np1}): `);

      return false;
    }

    return true;
  }

  prepareTables() {
    let chainType = MCC.getChainType(this.chainConfig.name);
    let prepared = prepareIndexerTables(chainType);

    this.dbTransactionClasses = prepared.transactionTable;
    this.dbBlockClass = prepared.blockTable;
  }

  async getBlockNumberTimestamp(blockNumber: number): Promise<number> {
    // todo: use FAST version of block read since we only need timestamp
    const block = (await this.getBlock(`getBlockNumberTimestamp`, blockNumber)) as IBlock;

    if (!block) {
      this.logger.error2(`getBlockNumberTimestamp(${blockNumber}) invalid block ${block}`);
      return 0;
    }

    return block.unixTimestamp;
  }

  async getAverageBlocksPerDay(): Promise<number> {
    const blockNumber0 = (await this.getBlockHeight(`getAverageBlocksPerDay`)) - this.chainConfig.numberOfConfirmations;
    const blockNumber1 = Math.ceil(blockNumber0 * 0.9);

    const time0 = await this.getBlockNumberTimestamp(blockNumber0);
    const time1 = await this.getBlockNumberTimestamp(blockNumber1);

    const time = (time0 - time1) / SECONDS_PER_DAY;

    return Math.ceil((blockNumber0 - blockNumber1) / time);
  }

  async getDBStartBlockNumber(): Promise<number> {
    const res = await this.dbService.manager.findOne(DBState, { where: { name: this.getChainN() } });

    if (res === undefined) return 0;

    return res.valueNumber;
  }

  async getSyncStartBlockNumber(): Promise<number> {
    const latestBlockNumber = (await this.getBlockHeight(`getSyncStartBlockNumber`)) - this.chainConfig.numberOfConfirmations;

    const averageBlocksPerDay = await this.getAverageBlocksPerDay();

    if (averageBlocksPerDay === 0) {
      this.logger.critical(`${this.chainConfig.name} avg blk per day is zero`)
      return 0;
    }

    this.logger.debug(`${this.chainConfig.name} avg blk per day ${averageBlocksPerDay}`);

    let startBlockNumber = Math.floor(latestBlockNumber - this.config.syncTimeDays * averageBlocksPerDay);

    const syncStartTime = getUnixEpochTimestamp() - this.config.syncTimeDays * SECONDS_PER_DAY;

    for (let i = 0; i < 12; i++) {

      const blockTime = await this.getBlockNumberTimestamp(startBlockNumber);

      if (blockTime <= syncStartTime) {
        return startBlockNumber;
      }

      // if time is still in the sync period then add one more hour
      startBlockNumber = Math.floor(startBlockNumber - averageBlocksPerDay / 24);
    }

    this.logger.critical(`${this.chainConfig.name} unable to find sync start date`);

    return startBlockNumber;
  }


  async saveOrWaitNp1Block(): Promise<boolean> {
    const Np1 = this.N + 1;

    const preparedBlocks = this.preparedBlocks.get(Np1);

    if (preparedBlocks) {
      // check if N+1 with blockNp1hash is already prepared (otherwise wait for it)
      for (let preparedBlock of preparedBlocks) {
        if (preparedBlock.block.blockHash === this.blockNp1hash) {
          // save prepared N+1 block with active hash
          await this.blockSave(preparedBlock.block, preparedBlock.transactions);

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
      // PANIC
      this.logger.error2(`N+1 (${Np1}) block not in processor`);
      return false;
    }

    // wait until N+1 block is saved (blockCompleted will save it immediatelly)
    this.waitNp1 = true;

    this.logger.debug(`^Gwaiting for block N=${Np1}`);


    // todo: [optimization] check how to use signals in TS (instead of loop with sleep)
    let timeStart = Date.now();

    while (this.waitNp1) {
      await sleepms(100);

      if (Date.now() - timeStart > 5000) {
        this.logger.warning(`saveOrWaitNp1Block timeout`);
        timeStart = Date.now();
      }
    }

    return true;
  }


  async runSyncRaw() {

    // for status display
    let statsN = this.N;
    let statsTime = Date.now();
    let statsBlocksPerSec = 0;

    this.T = await this.getBlockHeight(`runSyncRaw1`);

    this.isSyncing = true;

    let lastN = -1;

    while (true) {
      try {
        this.logger.debug1(`runSyncRaw loop N=${this.N} T=${this.T}`);
        const now = Date.now();

        // get chain top block
        if (now > statsTime + this.config.syncUpdateTimeMs) {
          // stats
          statsBlocksPerSec = (this.N - statsN) * 1000 / (now - statsTime);
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

          this.logger.debug(`sync ${this.N} to ${this.T}, ${blockLeft} blocks (ETA: ${secToHHMMSS(timeLeft)} bps: ${round(statsBlocksPerSec, 2)} cps: ${this.cachedClient.reqsPs})`);
        }
        else {
          this.logger.debug(`sync ${this.N} to ${this.T}, ${blockLeft} blocks (cps: ${this.cachedClient.reqsPs})`);
        }

        retry(`runSyncRaw::saveStatus`, async () => this.dbService.manager.save(dbStatus));

        // check if syncing has ended
        if (this.N >= this.T - this.chainConfig.numberOfConfirmations) {
          this.logger.group("SyncRaw completed")
          this.isSyncing = false;
          return;
        }

        for (let i = 0; i < this.chainConfig.syncReadAhead; i++) {
          // do not allow read ahead of T - confirmations
          if (this.N + i > this.T - this.chainConfig.numberOfConfirmations) break;

          this.blockProcessorManager.processSyncBlockNumber(this.N + i);
        }

        const blocknp1 = await this.cachedClient.getBlock(this.N + 1);
        this.blockNp1hash = blocknp1.stdBlockHash;

        while (!await this.saveOrWaitNp1Block()) {
          await sleepms(100);
          this.logger.debug(`runSyncRaw wait save N=${this.N} T=${this.T}`);
        }

      } catch (error) {
        logException(error, `runSyncRaw exception: `);

        getGlobalLogger().error2(`application exit`);
        process.exit(2);
      }
    }
  }

  async runSyncTips() {
    // for status display
    let statsN = this.N;
    let statsTime = Date.now();
    let statsBlocksPerSec = 0;

    this.T = await this.getBlockHeight(`runSyncTips1`);


    this.logger.info(`collecting top blocks...`);
    //const blocks: LiteBlock[] = await this.cachedClient.client.getBlockTips(this.N);
    const blocks: LiteBlock[] = await this.cachedClient.client.getTopLiteBlocks(this.T - this.N);
    this.logger.debug(`${blocks.length} block(s) collected`);

    this.isSyncing = true;

    const start = Date.now();

    for (let i = 1; i < blocks.length - this.chainConfig.numberOfConfirmations; i++) {

      for (let j = i; j < i + this.chainConfig.syncReadAhead && j < blocks.length; j++) {
        await this.blockProcessorManager.processSyncBlockHash(blocks[j].stdBlockHash);
      }

      const block = blocks[i];

      this.N = block.number - 1;
      this.blockNp1hash = block.stdBlockHash;

      await this.saveOrWaitNp1Block();

      // stats
      const now = Date.now();

      statsBlocksPerSec = (i + 1) * 1000 / (now - start);
      statsN = this.N;
      statsTime = now;

      const timeLeft = (this.T - this.N) / statsBlocksPerSec;

      const dbStatus = this.getStateEntryString("state", "sync", -1);
      dbStatus.valueNumber = timeLeft;

      const blockLeft = this.T - block.number;

      this.logger.debug(`sync ${this.N} to ${this.T}, ${blockLeft} blocks (ETA: ${secToHHMMSS(timeLeft)} bps: ${round(statsBlocksPerSec, 2)} cps: ${this.cachedClient.reqsPs})`);
    }

    this.logger.group("Sync completed")
    this.isSyncing = false;
  }


  async runSync() {
    switch (this.chainConfig.blockCollecting) {
      case "raw":
      case "rawUnforkable": await this.runSyncRaw(); break;
      case "tips": await this.runSyncTips(); break;
    }
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
    }
    catch (error) {
      logException(error, `dropTable`);
    }

  }

  async runIndexer() {
    // wait for db to connect
    await this.dbService.waitForDBConnection();


    // check if drop database is requested
    if (args.drop === "DO_DROP") {
      this.logger.error2("DROPPING DATABASES");

      await this.dropTable(`state`);

      for (let i of [`xrp`, `btc`, `ltc`, 'doge', 'algo']) {

        await this.dropTable(`${i}_block`);
        await this.dropTable(`${i}_transactions0`);
        await this.dropTable(`${i}_transactions1`);
      }

      this.logger.info("completed - exiting");

      return;
    }



    await this.prepareTables();

    const startBlockNumber = (await this.getBlockHeight(`runIndexer1`)) - this.chainConfig.numberOfConfirmations;
    // initial N initialization - will be later on assigned to DB or sync N
    this.N = startBlockNumber;

    // N is last completed block - confirmed and stored in DB
    const dbStartBlockNumber = await this.getDBStartBlockNumber();
    if (dbStartBlockNumber > 0) {
      this.N = dbStartBlockNumber;
    }

    await this.interlace.initialize(this.logger, this.dbService, this.dbTransactionClasses, this.chainConfig.minimalStorageHistoryDays, this.chainConfig.minimalStorageHistoryBlocks);

    // sync date
    if (this.config.syncEnabled) {
      const syncStartBlockNumber = await this.getSyncStartBlockNumber();

      this.N = Math.max(dbStartBlockNumber, syncStartBlockNumber);

      this.logger.group("Sync started")

      await this.runSync();
    }

    this.headerCollector.runBlockHeaderCollecting();

    let processedBlocks = 0;

    while (true) {
      try {
        const time0 = getTimeMilli();
        // get chain top block
        this.T = await this.getBlockHeight(`runIndexer2`);

        // change getBlock to getBlockHeader
        let blockNp1 = await this.getBlock(`runIndexer2`, this.N + 1);

        // has N+1 confirmation block
        const isNewBlock = this.N < this.T - this.chainConfig.numberOfConfirmations;
        const isChangedNp1Hash = this.blockNp1hash !== blockNp1.stdBlockHash;

        // status
        const dbStatus = this.getStateEntryString("state", "running", processedBlocks++, `N=${this.N} T=${this.T}` );

        retry(`runIndexer::saveStatus`, async () => await this.dbService.manager.save(dbStatus));

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
        this.blockProcessorManager.process(blockNp1);
      } catch (error) {
        logException(error, `runIndexer exception: `);
        await sleepms(100);
      }
    }
  }
}

function localRetryFailure(label: string) {
  getGlobalLogger().error2(`retry failure: ${label} - application exit`);
  process.exit(2);
}

async function runIndexer() {

  setRetryFailureCallback(localRetryFailure);

  // Reading configuration
  const config = readConfig(new IndexerConfiguration(), "indexer");
  const chains = readConfig(new ChainsConfiguration(), "chains");
  const credentials = readCredentials(new IndexerCredentials(), "indexer");

  const indexer = new Indexer(config, chains, credentials, args["chain"]);

  //displayStats();

  return await indexer.runIndexer();
}

// set all global loggers to the chain
setGlobalLoggerLabel(args["chain"]);

// read .env
DotEnvExt();

runIndexer()
  .then(() => process.exit(0))
  .catch((error) => {
    logException(error, `runIndexer `);
    process.exit(1);
  });
function retryMany(arg0: string, test: any[], arg2: number, arg3: number) {
  throw new Error("Function not implemented.");
}

