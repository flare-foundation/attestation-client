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
//  [ ] read all forks (utxo only - completely different block header collection)

import { ChainType, IBlock, MCC, sleep } from "flare-mcc";
import { CachedMccClient, CachedMccClientOptions } from "../caching/CachedMccClient";
import { DBBlockBase } from "../entity/dbBlock";
import { DBState } from "../entity/dbState";
import { DBTransactionBase } from "../entity/dbTransaction";
import { DatabaseService } from "../utils/databaseService";
import { DotEnvExt } from "../utils/DotEnvExt";
import { AttLogger, getGlobalLogger } from "../utils/logger";
import { getUnixEpochTimestamp, round, secToHHMMSS, sleepms } from "../utils/utils";
import { BlockProcessorManager } from "./blockProcessorManager";
import { prepareIndexerTables } from "./indexer-utils";
import { IndexerClientChain as IndexerChainConfiguration, IndexerConfiguration } from "./IndexerConfiguration";

var yargs = require("yargs");

const args = yargs
  .option("config", { alias: "c", type: "string", description: "Path to config json file", default: "./configs/config-indexer.json", demand: false })
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

  Csec2day = 60 * 60 * 24;

  dbTransactionClasses;
  dbBlockClass;

  prevEpoch = -1;
  tableLock = false;

  sync = false;

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
      },
    };

    this.cachedClient = new CachedMccClient(this.chainType, cachedMccClientOptions);

    this.blockProcessorManager = new BlockProcessorManager(this.logger, this.cachedClient, this.blockCompleted.bind(this), this.blockAlreadyCompleted.bind(this),);
  }

  get lastConfimedBlockNumber() {
    return this.N;
  }

  async waitForDBConnection() {
    while (true) {
      if (!this.dbService.connection) {
        this.logger.info("Waiting for DB connection");
        await sleep(1000);
        continue;
      }

      break;
    }
  }

  getBlockSaveEpoch(time: number): number {
    // 2022/01/01 00:00:00
    return Math.floor((time - 1640991600) / (14 * this.Csec2day));
  }

  getBlock(blockNumber: number): Promise<IBlock> {
    //this.logger.info( `getBlock(${blockNumber},N=${this.N},T=${this.T})`);

    return this.cachedClient.client.getBlock(blockNumber);
  }

  getBlockHeight(): Promise<number> {
    return this.cachedClient.client.getBlockHeight();
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
    if (!this.sync) {
      if (isBlockNp1) {
        const blockNp2 = await this.getBlock(this.N + 2);
        this.blockProcessorManager.process(blockNp2);
      }
    }

    return true;
  }

  async blockAlreadyCompleted(block: DBBlockBase) {
    this.logger.info(`^Galready completed ${block.blockNumber}:N+${block.blockNumber - this.N}`);
    // if N+1 is ready then begin processing N+2

    const isBlockNp1 = block.blockNumber == this.N + 1 && block.blockHash == this.blockNp1hash;

    if (!this.sync) {
      if (isBlockNp1) {
        const blockNp2 = await this.getBlock(this.N + 2);
        this.blockProcessorManager.process(blockNp2);
      }
    }
  }


  getChainN() {
    return this.chainConfig.name + "_N";
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

    // preliminary increase N so that block header thread does not overwrite newly written block
    // in case of error - the N is decresed on previous value
    this.N++;

    if (block.blockNumber !== Np1) {
      // what now? PANIC
      this.logger.error2(`expected to save blockNumber ${Np1} (but got ${block.blockNumber})`);
      return;
    }

    this.logger.debug(`start save block N=${Np1}`);

    try {
      const epoch = this.getBlockSaveEpoch(block.timestamp);

      const tableIndex = epoch & 1;

      while (this.tableLock) {
        await sleepms(1);
      }

      // check if tables need to be dropped and new created
      if (this.prevEpoch !== epoch && this.prevEpoch !== -1) {
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

      this.prevEpoch = epoch;

      const entity = this.dbTransactionClasses[tableIndex];

      // // create a copy of data with specific data types (for database)
      // // we need to make a copy so that entity class is correct
      // const transactionsCopy = Array<typeof entity>();
      // for (let d of transactions) {
      //   const newData = new (this.dbTransactionClasses[tableIndex])();

      //   for (let key of Object.keys(d)) {
      //     newData[key] = d[key];
      //   }

      //   // if( newData.paymentReference.length > 64 ) {
      //   //   this.logger.warning(`too long paymentReference ${d.transactionId} (len=${newData.paymentReference.length})`);
      //   //   newData.paymentReference = "";
      //   // }

      //   newData.transactionId = this.prepareString(newData.transactionId, 64);
      //   newData.paymentReference = this.prepareString(newData.paymentReference, 64);
      //   newData.hashVerify = this.prepareString(newData.hashVerify, 64);
      //   //newData.response = this.prepareString(newData.response, 1024 * 4, `transaction.response`);

      //   transactionsCopy.push(newData);
      // }

      // make block copy
      // todo: Luka do that in augmentBlock
      const blockCopy = new this.dbBlockClass();
      for (let key of Object.keys(block)) {
        blockCopy[key] = block[key];
      }

      blockCopy.blockHash = this.prepareString(blockCopy.blockHash, 128);
      //blockCopy.response = this.prepareString(blockCopy.response, 1024 * 4, `block.response`);

      blockCopy.transactions = transactions.length;

      // create transaction and save everything

      const time0 = Date.now();

      await this.dbService.connection
        .transaction(async (transaction) => {
          // setup new N
          const state = new DBState();
          state.name = this.getChainN();
          state.valueNumber = Np1;

          // block must be marked as confirmed
          if (transactions.length > 0) {
            //await transaction.save(transactionsCopy);
            await transaction.save(transactions);
          }
          await transaction.save(blockCopy);
          await transaction.save(state);
        })
        .then(() => {
          this.blockProcessorManager.clear(Np1);
          const time1 = Date.now();
          // increment N if all is ok
          this.logger.info(`^r^Windexer N=${Np1}^^ (time=${round(time1 - time0, 2)}ms)`);
        })
        .catch((error) => {
          // N is set on previous value
          this.N--;
          this.logger.error(`database error (N=${Np1}): ${error}`);
          this.logger.error(error.stack);
          return false;
        });

      return true;
    } catch (error) {
      this.logger.error2(`saveInterlaced error (N=${Np1}): ${error}`);
      this.logger.error(error.stack);
      return false;
    }


  }

  prepareTables() {
    let chainType = MCC.getChainType(this.chainConfig.name);
    let prepared = prepareIndexerTables(chainType);

    this.dbTransactionClasses = prepared.transactionTable;
    this.dbBlockClass = prepared.blockTable;
  }

  async getBlockNumberTimestamp(blockNumber: number): Promise<number> {
    // todo: use FAST version of block read since we only need timestamp
    const block = (await this.getBlock(blockNumber)) as IBlock;

    if (!block) {
      this.logger.error2(`getBlockNumberTimestamp(${blockNumber}) invalid block ${block}`);
      return 0;
    }

    return block.unixTimestamp;
  }

  async getAverageBlocksPerDay(): Promise<number> {
    const blockNumber0 = (await this.getBlockHeight()) - this.chainConfig.confirmationsCollect;
    const blockNumber1 = Math.ceil(blockNumber0 * 0.9);

    // todo: check if blockNumber1 is below out range

    const time0 = await this.getBlockNumberTimestamp(blockNumber0);
    const time1 = await this.getBlockNumberTimestamp(blockNumber1);

    const time = (time0 - time1) / this.Csec2day;

    return Math.floor((blockNumber0 - blockNumber1) / time);
  }

  async getDBStartBlockNumber(): Promise<number> {
    // const entity0 = this.dbTableClass[0];
    // const entity1 = this.dbTableClass[1];

    // const res0 = await this.dbService.connection.createQueryBuilder().from(entity0, 'transactions').select('blockNumber').orderBy("id", "DESC").limit(1).getRawMany();
    // const res1 = await this.dbService.connection.createQueryBuilder().from(entity1, 'transactions').select('blockNumber').orderBy("id", "DESC").limit(1).getRawMany();

    // return Math.max(res0.length > 0 ? res0[0].blockNumber : 0, res1.length > 0 ? res1[0].blockNumber : 0);

    const res = await this.dbService.manager.findOne(DBState, { where: { name: this.getChainN() } });

    if (res === undefined) return 0;

    return res.valueNumber;
  }

  async getSyncStartBlockNumber(): Promise<number> {
    const latestBlockNumber = (await this.getBlockHeight()) - this.chainConfig.confirmationsCollect;

    const averageBlocksPerDay = await this.getAverageBlocksPerDay();

    // todo: averageBlocksPerDay must be > 0

    this.logger.debug(`${this.chainConfig.name} avg blk per day ${averageBlocksPerDay}`);

    let blockNumber = Math.floor(latestBlockNumber - this.config.syncTimeDays * averageBlocksPerDay);

    const targetTime = getUnixEpochTimestamp() - this.config.syncTimeDays * this.Csec2day;

    for (let a = 0; a < 100; a++) {

      const blockTime = await this.getBlockNumberTimestamp(blockNumber);

      if (blockTime <= targetTime) {
        return blockNumber;
      }

      // if time is still in the sync period then add one more hour
      blockNumber = Math.floor(blockNumber - averageBlocksPerDay / 24);
    }

    // todo: report error

    return blockNumber;
  }


  blockHeaderHash = new Map<number, IBlock>();

  async saveBlocksHeaders(fromBlockNumber: number, toBlockNumberInc: number) {
    try {
      // save blocks from fromBlockNumber to toBlockNumberInc
      //this.logger.debug( `collect block headers [${fromBlockNumber} .. ${toBlockNumberInc}]` );

      let blocksText = "[";

      // limit number of blocks to look ahead
      // const maxBlocks = 8;
      // if (toBlockNumberInc - fromBlockNumber > maxBlocks) {
      //   blocks = `^Wlimited from ${toBlockNumberInc - fromBlockNumber}^^ [`;

      //   toBlockNumberInc = fromBlockNumber + maxBlocks;
      // }


      const blockPromisses = []

      for (let blockNumber = fromBlockNumber; blockNumber <= toBlockNumberInc; blockNumber++) {
        // todo: use fast getblock function (no details)
        blockPromisses.push(this.getBlock(blockNumber));
      }

      const blocks = await Promise.all( blockPromisses );

      const dbBlocks = [];
      let i=0;
      for (let blockNumber = fromBlockNumber; blockNumber <= toBlockNumberInc; blockNumber++, i++) {
        const block = blocks[i];

        if (!block || !block.hash) continue;

        // check cache
        const cachedBlock = this.blockHeaderHash.get(blockNumber);
        if (cachedBlock) {
          if (cachedBlock.hash === block.hash) {
            // same (ignored)
            blocksText += "^R" + blockNumber.toString() + "^^,";
            continue;
          }
          else {
            // hash replaced
            blocksText += "^W" + blockNumber.toString() + "^^,";
          }
        }
        else {
          // new
          blocksText += blockNumber.toString() + ",";
        }

        this.blockHeaderHash.set(blockNumber, block);

        const dbBlock = new this.dbBlockClass();

        dbBlock.blockNumber = blockNumber;
        dbBlock.blockHash = block.hash;
        dbBlock.timestamp = block.unixTimestamp;

        dbBlocks.push(dbBlock);
      }

      // remove all blockNumbers <= N+1
      while (dbBlocks.length > 0 && dbBlocks[0].blockNumber <= this.N + 1) {
        dbBlocks.splice(0, 1);
      }

      if (dbBlocks.length === 0) {
        this.logger.debug(`write block headers (no new blocks)`);
        return;
      }

      this.logger.debug(`write block headers ${blocksText}]`);

      await this.dbService.manager.save(dbBlocks);

      // await this.dbService.manager
      //   .createQueryBuilder()
      //   .update(DBBlock)
      //   .set({ confirmed: true })
      //   .where("blockNumber < :blockNumber", { blockNumber: blockNumber - this.chainConfig.confirmationsIndex })
      //   .execute();
    } catch (error) {
      this.logger.error2(`saveBlocksHeaders error: ${error}`);
      this.logger.error(error.stack);
    }
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
      }
    }

    if (!exists) {
      // PANIC
      this.logger.error2(`N+1 block not in processor`);
      return false;
    }

    // wait until N+1 block is saved (blockCompleted will save it immediatelly)
    this.waitNp1 = true;

    this.logger.debug(`^Gwaiting for block N=${Np1}`);
    // todo: check how to use signals in TS (instead of loop with sleep)
    while (this.waitNp1) {
      await sleepms(100);
    }

    return true;
  }

  async runBlockHeaderCollecting() {
    let localN = this.N;
    let localBlockNp1hash = "";

    while (true) {
      try {
        // get chain top block
        const localT = await this.getBlockHeight();
        const blockNp1 = (await this.getBlock(localN + 1)) as IBlock;

        // has N+1 confirmation block
        const isNewBlock = localN < localT - this.chainConfig.confirmationsCollect;
        const isChangedNp1Hash = localBlockNp1hash !== blockNp1.hash;

        // check if N + 1 hash is the same
        if (!isNewBlock && !isChangedNp1Hash) {
          await sleep(this.config.blockCollectTimeMs);
          continue;
        }

        // save block headers N+1 ... T
        await this.saveBlocksHeaders(localN + 1, localT);

        if (isNewBlock) {
          localN++;
        }

        // save block N+1 hash
        localBlockNp1hash = blockNp1.hash;

      } catch (error) {
        this.logger.error2(`Exception: ${error}`);
        this.logger.error(error.stack);

      }
    }
  }

  async runSync() {
    let syncN = this.N;
    let syncTime = Date.now();
    let blocksPerSec = 0;

    this.T = await this.getBlockHeight();

    this.sync = true;

    while (true) {
      try {
        const now = Date.now();

        // get chain top block
        if (now > syncTime + 10000) {
          blocksPerSec = (this.N - syncN) * 1000 / (now - syncTime);

          syncN = this.N;
          syncTime = now;

          this.T = await this.getBlockHeight();
        }

        const blockLeft = this.T - this.N;

        if (blocksPerSec > 0) {
          const timeLeft = (this.T - this.N) / blocksPerSec;
          this.logger.debug(`sync ${this.N} to ${this.T}, ${blockLeft} blocks (ETA: ${secToHHMMSS( timeLeft )} bps: ${round(blocksPerSec, 2)} cps: ${this.cachedClient.reqsPs})`);
        }
        else {
          this.logger.debug(`sync ${this.N} to ${this.T}, ${blockLeft} blocks (cps: ${this.cachedClient.reqsPs})`);
        }

        if (this.N >= this.T - this.chainConfig.confirmationsCollect) {
          this.logger.group("Sync completed")
          this.sync = false;
          return;
        }

        for (let a = 1; a < this.chainConfig.syncReadAhead; a++) {
          if (this.N + a - 1 >= this.T - this.chainConfig.confirmationsCollect) break;

          this.blockProcessorManager.processSyncBlockNumber(this.N + a);
        }

        this.blockNp1hash = (await this.cachedClient.getBlock(this.N + 1)).hash;
        this.saveOrWaitNp1Block();

      } catch (e) {
        this.logger.error2(`Exception: ${e}`);
        this.logger.error(e.stack);
      }
    }
  }


  async runIndexer() {
    // wait for db to connect
    await this.waitForDBConnection();

    await this.prepareTables();

    const startBlockNumber = (await this.getBlockHeight()) - this.chainConfig.confirmationsCollect;
    this.N = startBlockNumber;

    // N is last completed block - confirmed and stored in DB
    const dbStartBlockNumber = await this.getDBStartBlockNumber();
    if (dbStartBlockNumber > 0) {
      this.N = dbStartBlockNumber;
    }

    let syncMode = false;

    // sync date
    if (this.config.syncEnabled) {
      // get DB last number
      const syncStartBlockNumber = await this.getSyncStartBlockNumber();

      this.N = Math.max(dbStartBlockNumber, syncStartBlockNumber);

      syncMode = true;

      this.logger.group("Sync started")

      await this.runSync();
    }


    this.runBlockHeaderCollecting();

    let syncN = this.N;
    let syncTime = Date.now();
    let blocksPerSec = 0;

    while (true) {
      try {
        const now = Date.now();

        // get chain top block
        this.T = await this.getBlockHeight();

        // change getBlock to getBlockHeader
        let blockNp1 = await this.getBlock(this.N + 1);

        // has N+1 confirmation block
        const isNewBlock = this.N < this.T - this.chainConfig.confirmationsCollect;
        const isChangedNp1Hash = this.blockNp1hash !== blockNp1.hash;

        // check if N + 1 hash is the same
        if (!isNewBlock && !isChangedNp1Hash) {
          await sleep(this.config.blockCollectTimeMs);
          continue;
        }

        this.logger.debug(`indexer N=${this.N} T=${this.T} (isNewBlock=${isNewBlock})`);

        // save completed N+1 block or wait for it
        if (isNewBlock) {
          await this.saveOrWaitNp1Block();

          // N has changed so we must get N+1 again
          blockNp1 = await this.getBlock(this.N + 1);
        }

        // process new or changed N+1
        this.blockNp1hash = blockNp1.hash;
        this.blockProcessorManager.process(blockNp1);

      } catch (e) {
        this.logger.error2(`Exception: ${e}`);
        this.logger.error(e.stack);
      }
    }
  }
}

async function displayStats() {
  const period = 10000;

  const logger = getGlobalLogger();

  while (true) {
    await sleep(period);

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

async function runIndexer() {
  // Reading configuration
  const fs = require("fs");
  const config: IndexerConfiguration = JSON.parse(fs.readFileSync((args as any).config).toString()) as IndexerConfiguration;

  const indexer = new Indexer(config, args["chain"]);

  //displayStats();

  return await indexer.runIndexer();
}

// read .env
DotEnvExt();

// (new AttestationSpammer()).runSpammer()
runIndexer()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    console.error(error.stack);
    process.exit(1);
  });
