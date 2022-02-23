
//
//
//  [ ] proof of existance (tx reference, destination address, amount)
//  
//  block (from -14d up to -6 blocks)
//     - block number
//     - block hash
//     - block timestamp
//     - response
//
//  transaction 
//     - payment reference (non unique!!!) hex string 32 chars (hex lower case)
//     - transaction id
//     - timestamp
//     - block number
//     - response
//
// search by
//     - reference
//     - hash
//     - sender address
//     
//  [ ] XRP 1st
//  [ ] 100% make sure that block is completely saved until moved to the next block
//  [ ] check if using database per chain is easier than tables per chain
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
//  [ ] if N+1 block is ready go and read N+2
//
//  [ ] do not save blocks automatically but save only the ones below confirmationsIndex !!!


import { ChainType, MCC, sleep } from "flare-mcc";
import { RPCInterface } from "flare-mcc/dist/types";
import { Entity } from "typeorm";
import { DBBlock } from "../entity/dbBlock";
import { DBState } from "../entity/dbState";
import { DBTransactionBase, DBTransactionXRP0, DBTransactionXRP1 } from "../entity/dbTransaction";
import { DatabaseService } from "../utils/databaseService";
import { DotEnvExt } from "../utils/DotEnvExt";
import { AttLogger, getGlobalLogger } from "../utils/logger";
import { getUnixEpochTimestamp, round, sleepms } from "../utils/utils";
import { processBlockTest } from "./chainCollector";
import { IndexerClientChain as IndexerChainConfiguration, IndexerConfiguration } from "./IndexerConfiguration";

var yargs = require("yargs");

const args = yargs
  .option("config", { alias: "c", type: "string", description: "Path to config json file", default: "./configs/config-indexer.json", demand: false, })
  .option("chain", { alias: "a", type: "string", description: "Chain", default: "XRP", demand: false, })
  .argv;


class PreparedBlock {
  block: any;
  transactions: DBTransactionBase[];

  constructor(block: any, transactions: DBTransactionBase[]) {
    this.block = block;
    this.transactions = transactions;
  }
}

export class Indexer {
  config: IndexerConfiguration;
  chainConfig: IndexerChainConfiguration;
  chainType: ChainType;
  client!: RPCInterface;
  logger!: AttLogger;
  dbService: DatabaseService;

  N = 0;
  activeBlock: any = undefined;

  preparedBlocks = new Map<number, PreparedBlock>();


  static sendCount = 0;
  static txCount = 0;
  static valid = 0;
  static invalid = 0;
  static failed = 0;
  static retry = 0;


  Csec2day = 60 * 60 * 24;


  constructor(config: IndexerConfiguration, chainName: string) {
    this.config = config;
    this.chainType = MCC.getChainType(chainName);
    this.chainConfig = config.chains.find(el => el.name === chainName)!;

    this.logger = getGlobalLogger(chainName);

    this.dbService = new DatabaseService(this.logger);

    this.client = MCC.Client(this.chainType, {
      url: this.chainConfig.url,
      username: this.chainConfig.username,
      password: this.chainConfig.password,
      rateLimitOptions: {
        maxRPS: this.chainConfig.maxRequestsPerSecond,
        timeoutMs: this.chainConfig.clientTimeout,
        onSend: this.onSend.bind(this),
        onResponse: this.onResponse.bind(this),
        onLimitReached: this.limitReached.bind(this),
        onRetry: this.onRetry.bind(this),
      },
    }) as RPCInterface;
  }

  maxQueue = 5;
  wait: boolean = false;

  limitReached(inProcessing?: number, inQueue?: number) { }

  onSend(inProcessing?: number, inQueue?: number) {
    //this.logger.info(`Send ${inProcessing} ${inQueue}`);
    this.wait = inQueue! >= this.maxQueue;

    Indexer.txCount++;
  }

  onRetry(retryCount?: number) {
    //this.logger.info(`retry ${retryCount}`);
    Indexer.retry++;
  }

  onResponse(inProcessing?: number, inQueue?: number) {
    //this.logger.info(`Response ${inProcessing} ${inQueue} ${AttestationCollector.txCount}`);
    this.wait = inQueue! >= this.maxQueue;
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

      // connect dbService to logger
      //this.logger.dbService = this.dbService;

      break;
    }
  }

  getEpoch(time: number): number {
    // 2022/01/01 00:00:00
    return Math.floor((time - 1640991600) / 60);
  }

  prevEpoch = -1;
  tableLock = false;

  async queryInterlaced(reference: string): Promise<DBTransactionBase[]> {
    const references0 = await this.dbService.connection.createQueryBuilder().select('*').from(this.dbTableClass[0], 'transactions').where('transactions.paymentReference=:ref', { ref: reference }).getRawMany();
    const references1 = await this.dbService.connection.createQueryBuilder().select('*').from(this.dbTableClass[1], 'transactions').where('transactions.paymentReference=:ref', { ref: reference }).getRawMany();

    return references0.concat(references1);
  }

  async blockPrepared(block: DBBlock, transactions: DBTransactionBase[]): Promise<boolean> {

    // todo: check if blockNumber is already +6
    this.preparedBlocks.set(block.blockNumber, new PreparedBlock(block, transactions));

    return true;
  }


  async blockSave(block: DBBlock, transactions: DBTransactionBase[]): Promise<boolean> {

    if (transactions.length === 0) return true;

    if (block.blockNumber !== this.N + 1) {
      // what now?
      return;
    }

    try {

      const epoch = this.getEpoch(transactions[0].timestamp);

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

        this.logger.info(`drop table '${tableName}' (time ${time1 - time0}ms)`)

        this.tableLock = false;
      }

      this.prevEpoch = epoch;

      const entity = this.dbTableClass[tableIndex];

      // create a copy of data with specific data types (for database)
      // we need to make a copy so that entity class is correct
      const dataCopy = Array<typeof entity>();

      for (let d of transactions) {
        const newData = new this.dbTableClass[tableIndex];

        for (let key of Object.keys(d)) {
          newData[key] = d[key];
        }

        dataCopy.push(newData)
      }

      // create transaction and save everything
      await this.dbService.connection.transaction("READ COMMITTED", async transaction => {

        // setup new N
        const state = new DBState();
        state.name = "N";
        state.valueNumber = this.N + 1;

        // block must be marked as confirmed
        await transaction.save(dataCopy);
        await transaction.save(block);
        await transaction.save(state);

        // increment N if all is ok
        this.N++;

      }).catch((error) => {
        this.logger.error(`database error: ${error}`);
        return false;
      });

      return true;
    }
    catch (error) {
      this.logger.error(`saveInterlaced: ${error}`);
      return false;
    }
  }


  createChainTransactionEntity(tableName: string) {
    @Entity({ name: tableName }) class DBChainTransaction extends DBTransactionBase { }

    return DBChainTransaction;
  }

  dbTableClass = [undefined, undefined];

  async prepareTables() {
    switch (this.chainConfig.name) {
      case "XRP":
        this.dbTableClass[0] = DBTransactionXRP0;
        this.dbTableClass[1] = DBTransactionXRP1;
        break;
    }
  }

  async getBlockNumberTimestamp(blockNumber: number): Promise<number> {
    const block = await this.client.getBlock(blockNumber);

    // XRP
    return this.getBlockTimestamp(block);
  }
  getBlockTimestamp(block: any): number {
    // XRP
    return block.result.ledger.close_time;
  }

  async getAverageBlocksPerDay(): Promise<number> {
    const blockNumber0 = await this.client.getBlockHeight() - this.chainConfig.confirmationsCollect;
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

    const res = await this.dbService.manager.findOne(DBState, { where: { name: "N" } });

    if (res === undefined) return 0;

    return res.valueNumber;
  }

  async getSyncStartBlockNumber(): Promise<number> {
    const latestBlockNumber = await this.client.getBlockHeight() - this.chainConfig.confirmationsCollect;

    const averageBlocksPerDay = await this.getAverageBlocksPerDay();

    // todo: averageBlocksPerDay must be > 0

    this.logger.debug(`${this.chainConfig.name} avg blk per day ${averageBlocksPerDay}`);

    let blockNumber = latestBlockNumber - this.config.syncTimeDays * averageBlocksPerDay;

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

  async getBlockByHash(hash: string) {
    // - check if the block with given hash is in cache
    // - if it is, return it
    // - if it is not, query for it an return it.
    throw new Error("Not yet implemented");
  }
  async runIndexer() {

    // wait for db to connect
    await this.waitForDBConnection();

    await this.prepareTables();

    const startBlockNumber = await this.client.getBlockHeight() - this.chainConfig.confirmationsCollect;

    this.N = startBlockNumber;

    // N is last completed block - confirmed and stored in DB

    if (this.config.syncEnabled) {
      // get DB last number
      const dbStartBlockNumber = await this.getDBStartBlockNumber();
      const syncStartBlockNumber = await this.getSyncStartBlockNumber();

      this.N = Math.max(dbStartBlockNumber, syncStartBlockNumber);
    }

    while (true) {
      try {
        // get chain top block
        const latestBlockNumber = await this.client.getBlockHeight();

        //  change getBlock to getBlockHeader
        const blockNp1 = this.client.getBlock(this.N + 1);

        // has N+1 confirmation block
        const newBlock = this.N < latestBlockNumber - this.chainConfig.confirmationsCollect;
        const changedNp1Hash = this.activeBlock.hash !== blockNp1.hash;

        // check if N + 1 hash is the same
        if (!newBlock && !changedNp1Hash) {
          await sleep(this.config.blockCollectTimeMs);
          continue;
        }

        // if new block, check if block is already prepared
        if (newBlock) {
          const Np1 = this.N + 1;
          const preparedBlock = this.preparedBlocks.get(Np1);

          // todo: what to do if this is not prepared yet ???
          if( preparedBlock!==undefined)
          {
            this.blockSave( preparedBlock.block , preparedBlock.transactions );

            this.preparedBlocks.delete( Np1 );
          }
        }


        // save block headers N+1 ... top
        this.saveBlocksHeaders(latestBlockNumber);

        //this.activeBlock = block;
        processBlockTest(this.client, blockNp1, this.blockPrepared.bind(this));

      } catch (e) {
        this.logger.error2(`Exception: ${e}`);
      }
    }
  }



  async saveBlocksHeaders(latestBlockNumber: number) {

    try {
      // save blocks from N+1 to latestBlockNumber
      const dbBlocks = [];
      for (let blockNumber = this.N + 1; blockNumber <= latestBlockNumber; blockNumber++) {
        const block = this.client.getBlock(blockNumber);

        const dbBlock = new DBBlock();
        dbBlock.blockNumber = blockNumber;
        dbBlock.blockHash = block.hash;
        dbBlock.timestamp = this.getBlockTimestamp(block);

        dbBlocks.push(dbBlock);
      }

      this.dbService.manager.save(dbBlocks);


      // await this.dbService.manager
      //   .createQueryBuilder()
      //   .update(DBBlock)
      //   .set({ confirmed: true })
      //   .where("blockNumber < :blockNumber", { blockNumber: blockNumber - this.chainConfig.confirmationsIndex })
      //   .execute();
    }
    catch (error) {
      this.logger.error2(`error ${error}`);
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
      )} tx/req)   valid ${Indexer.valid} invalid ${Indexer.invalid} failed ${Indexer.failed} retry  ${Indexer.retry
      }`
    );
    Indexer.sendCount = 0;
    Indexer.txCount = 0;
    Indexer.failed = 0;
    Indexer.retry = 0;
  }
}

async function runIndexer() {
  // Reading configuration
  const fs = require("fs");
  const config: IndexerConfiguration = JSON.parse(fs.readFileSync((args as any).config).toString()) as IndexerConfiguration;

  const indexer = new Indexer(config, args["chain"]);

  displayStats();

  return await indexer.runIndexer();
}


// read .env
DotEnvExt();

// (new AttestationSpammer()).runSpammer()
runIndexer()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

