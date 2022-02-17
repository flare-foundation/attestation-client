
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
//
//  [x] indexer sync - create database for x days back
//  [x] create table for each chain
//  [ ] option what chains are running
//
//  [ ] do not save blocks automatically but save only the ones below confirmationsIndex !!!


import { ChainType, MCC, sleep } from "flare-mcc";
import { RPCInterface } from "flare-mcc/dist/types";
import { Entity } from "typeorm";
import { DBTransactionBase, DBTransactionXRP0, DBTransactionXRP1 } from "../entity/dbTransaction";
import { DatabaseService } from "../utils/databaseService";
import { DotEnvExt } from "../utils/DotEnvExt";
import { AttLogger, getGlobalLogger } from "../utils/logger";
import { getUnixEpochTimestamp, round, sleepms } from "../utils/utils";
import { collectChainTransactionInformation } from "./chainCollector";
import { IndexerClientChain as IndexerChainConfiguration, IndexerConfiguration } from "./IndexerConfiguration";

var yargs = require("yargs");

const args = yargs
  .option("config", { alias: "c", type: "string", description: "Path to config json file", default: "./configs/config-indexer.json", demand: false, })
  .option("chain", { alias: "a", type: "string", description: "Chain", default: "XRP", demand: false, })
  .argv;

export class Indexer {
  config: IndexerConfiguration;
  chainConfig: IndexerChainConfiguration;
  chainType: ChainType;
  client!: RPCInterface;
  logger!: AttLogger;
  dbService: DatabaseService;


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

  async saveInterlaced(data: DBTransactionBase) {

    try {

      const epoch = this.getEpoch(data.timestamp);

      const tableIndex = epoch & 1;

      while (this.tableLock) {
        await sleepms(1);
      }

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

      //const data0 = tableIndex ? new DBTransaction1() : new DBTransaction0();
      const data0 = new this.dbTableClass[tableIndex];

      for (let key of Object.keys(data)) {
        data0[key] = data[key];
      }

      await this.dbService.manager.save(data0).catch((error) => {
        this.logger.error(`database error: ${error}`);
      });
    }
    catch( error ){
      this.logger.error(`saveInterlaced: ${error}`);
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
    return block.result.ledger.close_time;
  }

  async getAverageBlocksPerDay(): Promise<number> {
    const blockNumber0 = await this.client.getBlockHeight() - this.chainConfig.confirmationsCollect;
    const blockNumber1 = Math.ceil(blockNumber0 * 0.9);

    const time0 = await this.getBlockNumberTimestamp(blockNumber0);
    const time1 = await this.getBlockNumberTimestamp(blockNumber1);

    const time = (time0 - time1) / this.Csec2day;

    return Math.floor((blockNumber0 - blockNumber1) / time);
  }

  async getDBStartBlockNumber(): Promise<number> {
    const entity0 = this.dbTableClass[0];
    const entity1 = this.dbTableClass[1];

    const res0 = await this.dbService.connection.createQueryBuilder().from(entity0, 'transactions').select('blockNumber').orderBy("id", "DESC").limit(1).getRawMany();
    const res1 = await this.dbService.connection.createQueryBuilder().from(entity1, 'transactions').select('blockNumber').orderBy("id", "DESC").limit(1).getRawMany();

    return Math.max(res0.length > 0 ? res0[0].blockNumber : 0, res1.length > 0 ? res1[0].blockNumber : 0);
  }

  async getSyncStartBlockNumber(): Promise<number> {
    const latestBlockNumber = await this.client.getBlockHeight() - this.chainConfig.confirmationsCollect;

    const averageBlocksPerDay = await this.getAverageBlocksPerDay();

    this.logger.debug(`${this.chainConfig.name} avg blk per day ${averageBlocksPerDay}`);

    let blockNumber = latestBlockNumber - this.config.syncTimeDays * averageBlocksPerDay;

    const targetTime = getUnixEpochTimestamp() - this.config.syncTimeDays * this.Csec2day;

    for (let a = 0; a < 100; a++) {
      const blockTime = await this.getBlockNumberTimestamp(blockNumber);

      if (blockTime <= targetTime) {
        return blockNumber;
      }

      // if time is still in the sync period then add one more hour
      blockNumber = Math.floor( blockNumber - averageBlocksPerDay / 24 );
    }

    return blockNumber;
  }

  async runIndexer() {

    // wait for db to connect
    await this.waitForDBConnection();

    await this.prepareTables();

    const startBlockNumber = await this.client.getBlockHeight() - this.chainConfig.confirmationsCollect;

    let blockNumber = startBlockNumber;

    if (this.config.syncEnabled) {
      // get DB last number
      const dbStartBlockNumber = await this.getDBStartBlockNumber();
      const syncStartBlockNumber = await this.getSyncStartBlockNumber();

      blockNumber = Math.max(dbStartBlockNumber, syncStartBlockNumber);
    }

    while (true) {
      try {
        // create process that will collect valid transactions
        const latestBlockNumber = await this.client.getBlockHeight() - this.chainConfig.confirmationsCollect;
        if (blockNumber >= latestBlockNumber + 1) {
          await sleep(100);
          continue;
        }

        this.indexBlock(this.client, blockNumber);

        // move to next block
        blockNumber++;
      } catch (e) {
        this.logger.error2(`Exception: ${e}`);
      }
    }
  }

  async indexBlock(client: RPCInterface, blockNumber: number) {
    let block = await client.getBlock(blockNumber)

    let hashes = await client.getTransactionHashesFromBlock(block);

    for (let tx of hashes) {
      collectChainTransactionInformation(this.client, tx)
        .then(async (data: DBTransactionBase) => {
          // Add block height to transaction data
          data.blockNumber = blockNumber;
          // save
          this.saveInterlaced(data);
        })
        .catch((error) => {
          Indexer.failed++;
          // skip
          if (!error.message.endsWith("property 'message' of undefined")) {
            this.logger.error(`Verification error ${error}`);
          }
        });

      Indexer.sendCount++;

      // wait a bit
      await sleep(50);
      while (this.wait) {
        await sleep(5);
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

