
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
//  [ ] indexer sync - create database for x days back


import { ChainType, MCC, sleep, toBN, unPrefix0x } from "flare-mcc";
import { RPCInterface } from "flare-mcc/dist/types";
import { DBTransaction0, DBTransaction1, DBTransactionBase } from "../entity/dbTransaction";
import { DatabaseService } from "../utils/databaseService";
import { DotEnvExt } from "../utils/DotEnvExt";
import { AttLogger, getGlobalLogger } from "../utils/logger";
import { getUnixEpochTimestamp, round, sleepms } from "../utils/utils";
import { buildAttestationRequest } from "../verification/attestation-request-utils";
import { AttestationType, ChainVerification, TransactionAttestationRequest } from "../verification/attestation-types";
import { verifyTransactionAttestation } from "../verification/verification";
import { IndexerClientChain as IndexerChainConfiguration, IndexerConfiguration } from "./IndexerConfiguration";

var yargs = require("yargs");

const args = yargs
  .option("config", { alias: "c", type: "string", description: "Path to config json file", default: "./configs/config-indexer.json", demand: false, })
  .option("chain", { alias: "a", type: "string", description: "Chain", default: "XRP", demand: false, })
  .argv;

class Indexer {
  config: IndexerConfiguration;
  chainConfig: IndexerChainConfiguration;
  chainType!: ChainType;
  client!: RPCInterface;
  logger!: AttLogger;
  dbService: DatabaseService;


  static sendCount = 0;
  static txCount = 0;
  static valid = 0;
  static invalid = 0;
  static failed = 0;
  static retry = 0;


  constructor(config: IndexerConfiguration, chain: string) {
    this.config = config;
    this.chainType = MCC.getChainType(chain);
    this.chainConfig = config.chains.find(el => el.name === chain)!;

    this.logger = getGlobalLogger(args["loggerLabel"]);

    this.dbService = new DatabaseService(this.logger);

    switch (this.chainType) {
      case ChainType.BTC:
      case ChainType.LTC:
      case ChainType.DOGE:
        this.client = MCC.Client(this.chainType, {
          url: this.chainConfig.url,
          username: this.chainConfig.username,
          password: this.chainConfig.password,
          rateLimitOptions: {
            maxRPS: 50,
            timeoutMs: 3000,
            onSend: this.onSend.bind(this),
            onResponse: this.onResponse.bind(this),
            onLimitReached: this.limitReached.bind(this),
            onRetry: this.onRetry.bind(this),
          },
        }) as RPCInterface;
        break;
      case ChainType.XRP:
        this.client = MCC.Client(this.chainType, {
          url: this.chainConfig.url,
          username: this.chainConfig.username,
          password: this.chainConfig.password,
          rateLimitOptions: {
            maxRPS: 50,
            timeoutMs: 3000,
            onSend: this.onSend.bind(this),
            onResponse: this.onResponse.bind(this),
            onLimitReached: this.limitReached.bind(this),
          },
        }) as RPCInterface;
        break;
      default:
        throw new Error("");
    }
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

  async queryInterlaced(reference: string) : Promise<DBTransactionBase[]> {
    const references0 = await this.dbService.connection.createQueryBuilder().select('*').from(DBTransaction0,'transactions').where('transactions.paymentReference=:ref',{ref:reference}).getRawMany();
    const references1 = await this.dbService.connection.createQueryBuilder().select('*').from(DBTransaction1,'transactions').where('transactions.paymentReference=:ref',{ref:reference}).getRawMany();

    return references0.concat( references1 );
  }

  async saveInterlaced(data: DBTransactionBase) {

    const epoch = this.getEpoch(data.timestamp);

    const tableIndex = epoch & 1;

    while( this.tableLock )
    {
      await sleepms( 1 );
    }

    if (this.prevEpoch !== epoch && this.prevEpoch !== -1) {

      this.tableLock = true;

      const time0=Date.now();
      const queryRunner = this.dbService.connection.createQueryRunner();
      const tableName = `transactions${tableIndex}`;
      const table = await queryRunner.getTable(tableName);
      await queryRunner.dropTable(table);
      await queryRunner.createTable(table);
      await queryRunner.release();
      const time1=Date.now();

      this.logger.info(`drop table '${tableName}' (time ${time1-time0}ms)`)

      this.tableLock = false;
    }

    this.prevEpoch = epoch;

    const data0 = tableIndex ? new DBTransaction1() : new DBTransaction0();

    for (let key of Object.keys(data)) {
      data0[key] = data[key];
    }

    await this.dbService.manager.save(data0).catch((error) => {
      this.logger.error(`database error: ${error}`);
    });

  }

  async runIndexer() {

    await this.waitForDBConnection();

    let blockNumber = await this.client.getBlockHeight() - this.chainConfig.confirmations;

    // wait for db to connect

    while (true) {
      try {
        // create process that will collect valid transactions
        let latestBlockNumber = await this.client.getBlockHeight() - this.chainConfig.confirmations;
        if (blockNumber >= latestBlockNumber) {
          await sleep(100);
          continue;
        }

        let block = await this.client.getBlock(blockNumber)
        let confirmationBlock = await this.client.getBlock(blockNumber + this.chainConfig.confirmations);

        let hashes = await this.client.getTransactionHashesFromBlock(block);

        for (let tx of hashes) {
          let attType = AttestationType.Payment;
          let tr = {
            id: tx,
            dataAvailabilityProof: await this.client.getBlockHash(confirmationBlock),
            blockNumber: blockNumber,
            chainId: this.chainType,
            attestationType: attType,
            instructions: toBN(0),
          } as TransactionAttestationRequest;

          const attRequest = buildAttestationRequest(tr);

          //this.logger.info("verifyTransactionAttestation");
          verifyTransactionAttestation(this.client, tr, { skipDataAvailabilityProof: true })
            .then(async (txData: ChainVerification) => {
              // save
              const response = JSON.stringify(txData.transaction.result);

              const data = new DBTransactionBase();

              data.chainType = this.chainType;
              data.blockNumber = blockNumber;
              data.blockTransactionIndex = 0; // Todo
              //data.timestamp = txData.blockTimestamp.toNumber();
              data.timestamp = getUnixEpochTimestamp();

              data.transactionId = unPrefix0x(txData.transaction.result.hash.toLowerCase());

              data.hashVerify = ""; // Todo
              data.paymentReference = ""; // Todo

              data.response = response;

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
      } catch (e) {
        this.logger.error2(`Exception: ${e}`);
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
