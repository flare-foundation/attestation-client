//
//  [x] 100% make sure that block is completely saved until moved to the next block
//  [x] check if using database per chain is easier than tables per chain
//
//  [x] indexer sync - create database for x days back
//  [x] create table for each chain
//  [ ] multiple options what chains are to be started
//  [x] transaction save (with block and state) must be a transaction!
//  [x] store ALL block into DB immediately
//  [x] also save block
//  [x] 'confirmed' on all unconfirmed blocks than are less than X-this.chainConfig.confirmations
//  [x] when start N = height - 6
//  [x] all is now N oriented. I need to add into DB N+1 -> height
//  [x] we process N+1
//  [x] blockHash is changed not blockNumber
//  [x] if N+1 block is ready go and read N+2
//  [x] do not save blocks automatically but save only the ones below confirmationsIndex !!!

//  [x] keep collecting blocks while waiting for N+1 to complete

//  [x] end sync issue with block processing
//  [x] fix node execution (db is not working)
//  [x] read all forks (utxo only - completely different block header collection)

//  [x] change block database interlace logic (time and block)
//  [x] save vote verification data
//  [x] add indexQueryHandler DAC info

//  [ ] split file into logical units

import { ChainType, IBlock, MCC } from "flare-mcc";
import { CachedMccClient, CachedMccClientOptions } from "../caching/CachedMccClient";
import { DBBlockBase } from "../entity/dbBlock";
import { DBState } from "../entity/dbState";
import { DBTransactionBase } from "../entity/dbTransaction";
import { DatabaseService } from "../utils/databaseService";
import { DotEnvExt } from "../utils/DotEnvExt";
import { AttLogger, getGlobalLogger, logException } from "../utils/logger";
import { retry } from "../utils/PromiseTimeout";
import { getUnixEpochTimestamp, round, secToHHMMSS, sleepms } from "../utils/utils";
import { BlockProcessorManager } from "./blockProcessorManager";
import { HeaderCollector } from "./headerCollector";
import { prepareIndexerTables, SECONDS_PER_DAY } from "./indexer-utils";
import { IndexerClientChain as IndexerChainConfiguration, IndexerConfiguration } from "./IndexerConfiguration";
import { Interlacing } from "./interlacing";

var yargs = require("yargs");

const args = yargs
  .option("config", { alias: "c", type: "string", description: "Path to config json file", default: "./configs/config-indexer.json", demand: false })
  .option("drop", { alias: "d", type: "string", description: "Drop databases", default: "", demand: false })
  .option("chain", { alias: "a", type: "string", description: "Chain", default: "XRP", demand: false }).argv;

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
  chainConfig: IndexerChainConfiguration;
  chainType: ChainType;
  cachedClient: CachedMccClient<any, any>;
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

  constructor(config: IndexerConfiguration, chainName: string) {
    this.config = config;
    this.chainType = MCC.getChainType(chainName);
    this.chainConfig = config.chains.find((el) => el.name === chainName)!;

    this.logger = getGlobalLogger(chainName);

    this.dbService = new DatabaseService(this.logger);

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

    this.cachedClient = new CachedMccClient(this.chainType, cachedMccClientOptions);

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

    const isBlockNp1 = block.number == this.N + 1 && block.hash == this.blockNp1hash;

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

  prepareString(text: string, maxLength: number, reportOwerflow: string = null): string {
    if (!text) return "";
    if (text.length < maxLength) return text;

    if (typeof text != "string") {
      this.logger.warning(`prepareString warning: expected type is string`);
      return text;
    }

    if (reportOwerflow) {
      //this.logger.warning(`prepareString warning: ${reportOwerflow} overflow ${maxLength} (length=${text.length})`);
    }

    return text.substring(0, maxLength - 1);
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

      blockCopy.blockHash = this.prepareString(blockCopy.blockHash, 128);

      blockCopy.transactions = transactions.length;

      // create transaction and save everything
      const time0 = Date.now();

      try {
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

        // increment N if all is ok
        this.N = Np1;

        this.blockProcessorManager.clear(Np1);
        const time1 = Date.now();
        this.logger.info(`^r^Wsave completed - next N=${Np1}^^ (time=${round(time1 - time0, 2)}ms)`);

      } catch (error) {
        logException(error, `database error (N=${Np1}): `);

        return false;
      }

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
    const blockNumber0 = (await this.getBlockHeight(`getAverageBlocksPerDay`)) - this.chainConfig.confirmationBlocks;
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
    const latestBlockNumber = (await this.getBlockHeight(`getSyncStartBlockNumber`)) - this.chainConfig.confirmationBlocks;

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
      if (processor.block.number == Np1 && processor.block.hash == this.blockNp1hash) {
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


  async runSync() {

    // for status display
    let statsN = this.N;
    let statsTime = Date.now();
    let statsBlocksPerSec = 0;

    this.T = await this.getBlockHeight(`runSync1`);

    this.isSyncing = true;

    let lastN = -1;

    while (true) {
      try {
        const now = Date.now();

        // get chain top block
        if (now > statsTime + this.config.syncUpdateTimeMs) {
          // stats
          statsBlocksPerSec = (this.N - statsN) * 1000 / (now - statsTime);
          statsN = this.N;
          statsTime = now;

          // take actual top
          this.T = await this.getBlockHeight(`runSync2`);
        }

        // wait until we save N+1 block
        if (lastN === this.N) {
          await sleepms(100);
          continue;
        }
        lastN = this.N;

        const blockLeft = this.T - this.N;

        if (statsBlocksPerSec > 0) {
          const timeLeft = (this.T - this.N) / statsBlocksPerSec;
          this.logger.debug(`sync ${this.N} to ${this.T}, ${blockLeft} blocks (ETA: ${secToHHMMSS(timeLeft)} bps: ${round(statsBlocksPerSec, 2)} cps: ${this.cachedClient.reqsPs})`);
        }
        else {
          this.logger.debug(`sync ${this.N} to ${this.T}, ${blockLeft} blocks (cps: ${this.cachedClient.reqsPs})`);
        }

        // check if syncing has ended
        if (this.N >= this.T - this.chainConfig.confirmationBlocks) {
          this.logger.group("Sync completed")
          this.isSyncing = false;
          return;
        }

        for (let i = 0; i < this.chainConfig.syncReadAhead; i++) {
          // do not allow read ahead of T - confirmations
          if (this.N + i > this.T - this.chainConfig.confirmationBlocks) break;

          this.blockProcessorManager.processSyncBlockNumber(this.N + i);
        }

        this.blockNp1hash = (await this.cachedClient.getBlock(this.N + 1)).hash;

        while (!await this.saveOrWaitNp1Block()) {
          await sleepms(100);
        }

      } catch (error) {
        logException(error, `runSync exception: `);
      }
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

    const startBlockNumber = (await this.getBlockHeight(`runIndexer1`)) - this.chainConfig.confirmationBlocks;
    // initial N initialization - will be later on assigned to DB or sync N
    this.N = startBlockNumber;

    // N is last completed block - confirmed and stored in DB
    const dbStartBlockNumber = await this.getDBStartBlockNumber();
    if (dbStartBlockNumber > 0) {
      this.N = dbStartBlockNumber;
    }

    await this.interlace.initialize(this.logger, this.dbService, this.dbTransactionClasses, this.chainConfig.interlaceTimeRange, this.chainConfig.interlaceBlockRange);

    // sync date
    if (this.config.syncEnabled) {
      const syncStartBlockNumber = await this.getSyncStartBlockNumber();

      this.N = Math.max(dbStartBlockNumber, syncStartBlockNumber);

      this.logger.group("Sync started")

      await this.runSync();
    }

    this.headerCollector.runBlockHeaderCollecting();

    while (true) {
      try {
        // get chain top block
        this.T = await this.getBlockHeight(`runIndexer2`);

        // change getBlock to getBlockHeader
        let blockNp1 = await this.getBlock(`runIndexer2`, this.N + 1);

        // has N+1 confirmation block
        const isNewBlock = this.N < this.T - this.chainConfig.confirmationBlocks;
        const isChangedNp1Hash = this.blockNp1hash !== blockNp1.hash;

        // check if N + 1 hash is the same
        if (!isNewBlock && !isChangedNp1Hash) {
          await sleepms(this.config.blockCollectTimeMs);

          this.logger.debug3(`indexer waiting for new block`);

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
        this.blockNp1hash = blockNp1.hash;
        this.blockProcessorManager.process(blockNp1);
      } catch (error) {
        logException(error, `runIndexer exception: `);
      }
    }
  }
}

async function displayStats() {
  const period = 10000;

  const logger = getGlobalLogger();

  while (true) {
    await sleepms(period);

    logger.info(
      `^Y${round((Indexer.sendCount * 1000) / period, 1)} req/sec  ${round((Indexer.txCount * 1000) / period, 1)} tx/sec (${round(
        Indexer.txCount / Indexer.sendCount,
        1
      )} tx/req)   valid ${Indexer.valid} invalid ${Indexer.invalid}`
    );
    Indexer.sendCount = 0;
    Indexer.txCount = 0;
  }
}


async function testDelay(delay: number, result: number): Promise<number> {
  console.log(`start ${result}`);
  await sleepms(delay);
  console.log(`done ${result}`);
  return result;
}

async function runIndexer() {

  // const test = [];

  // test.push(() => testDelay(100, 1));
  // test.push(() => testDelay(600, 2));
  // test.push(() => testDelay(1200, 3));
  // test.push(() => testDelay(100, 4));

  // const testRes = await retry(`test`, () => testDelay(100, 4) , 80 );
  // //const testRes = await Promise.all( test );

  // console.log(testRes);
  // console.log(testRes);

  // Reading configuration
  const fs = require("fs");
  const config: IndexerConfiguration = JSON.parse(fs.readFileSync((args as any).config).toString()) as IndexerConfiguration;

  const indexer = new Indexer(config, args["chain"]);

  //displayStats();

  return await indexer.runIndexer();
}

// read .env
DotEnvExt();

//console.log(process.env);

// (new AttestationSpammer()).runSpammer()
runIndexer()
  .then(() => process.exit(0))
  .catch((error) => {
    logException(error, `runIndexer `);
    process.exit(1);
  });
function retryMany(arg0: string, test: any[], arg2: number, arg3: number) {
  throw new Error("Function not implemented.");
}

