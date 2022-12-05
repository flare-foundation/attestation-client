// Run tests with the following command lines:
// Make sure that you are connected to a synced database and indexers are running
//
// SOURCE_ID=XRP DOTENV_INCLUDE=".indexer.remote.dev.read.env" yarn hardhat test test/IndexedQueryManager.test.ts
// SOURCE_ID=BTC DOTENV_INCLUDE=".indexer.remote.dev.read.env" yarn hardhat test test/IndexedQueryManager.test.ts
// SOURCE_ID=LTC DOTENV_INCLUDE=".indexer.remote.dev.read.env" yarn hardhat test test/IndexedQueryManager.test.ts
// SOURCE_ID=DOGE DOTENV_INCLUDE=".indexer.remote.dev.read.env" yarn hardhat test test/IndexedQueryManager.test.ts
// SOURCE_ID=ALGO DOTENV_INCLUDE=".indexer.remote.dev.read.env" yarn hardhat test test/IndexedQueryManager.test.ts

import { ChainType, MccClient } from "@flarenetwork/mcc";
import { assert } from "chai";
import { DataSource, DataSourceOptions, EntityManager } from "typeorm";
import { DBBlockBase, DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { DBTransactionBase, DBTransactionXRP0 } from "../../lib/entity/indexer/dbTransaction";
import { IndexedQueryManagerOptions } from "../../lib/indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../../lib/indexed-query-manager/IndexedQueryManager";
import { prepareGenerator, prepareRandomGenerators, TxOrBlockGeneratorType } from "../../lib/indexed-query-manager/random-attestation-requests/random-ar";
import { RandomDBIterator } from "../../lib/indexed-query-manager/random-attestation-requests/random-query";
import { IndexerConfiguration } from "../../lib/indexer/IndexerConfiguration";
import { createTypeOrmOptions } from "../../lib/servers/ws-server/src/utils/db-config";
import { DotEnvExt } from "../../lib/utils/DotEnvExt";
import { getUnixEpochTimestamp } from "../../lib/utils/utils";
import { getSourceName, SourceId } from "../../lib/verification/sources/sources";
import { generateTestIndexerDB } from "./utils/indexerTestDataGenerator";

const SOURCE_ID = SourceId[process.env.SOURCE_ID] ?? SourceId.XRP;
const NUMBER_OF_CONFIRMATIONS = 1;
const FIRST_BLOCK = 100;
const LAST_BLOCK = 203;
const LAST_CONFIRMED_BLOCK = 200;
const CHAIN_TYPE = ChainType.XRP;
const DB_BLOCK_TABLE = DBBlockXRP;
const DB_TX_TABLE = DBTransactionXRP0;
const BLOCK_CHOICE = 150;
const ZERO_PAYMENT_REFERENCE = "0000000000000000000000000000000000000000000000000000000000000000";
const TXS_IN_BLOCK = 10;


console.warn(`This test should run while ${getSourceName(SOURCE_ID)} indexer is running`);
// Overriding .env variables for this particular test only
console.warn(`Overriding DOTENV=DEV, NODE_ENV=development`);
process.env.DOTENV = "DEV";
process.env.NODE_ENV = "development";
process.env.VERIFIER_TYPE = "xrp"
DotEnvExt();

describe("Indexed query manager", () => {
  let indexedQueryManager: IndexedQueryManager;
  let client: MccClient;
  let indexerConfiguration: IndexerConfiguration;
  let chainName: string;
  let startTime = 0;
  let selectedBlock: DBBlockBase;
  let selectedReferencedTransaction: DBTransactionBase;

  before(async () => {
    let dbOptions = await createTypeOrmOptions(":memory:", "test");
    let dataSource = new DataSource(dbOptions as DataSourceOptions);
    await dataSource.initialize();
    let now = getUnixEpochTimestamp();
    await generateTestIndexerDB(
      CHAIN_TYPE,
      dataSource.manager,
      DB_BLOCK_TABLE,
      DB_TX_TABLE,
      FIRST_BLOCK,
      LAST_BLOCK,
      now,
      LAST_CONFIRMED_BLOCK,
      TXS_IN_BLOCK
    );
    startTime = now - (LAST_BLOCK - FIRST_BLOCK);

    const options: IndexedQueryManagerOptions = {
      entityManager: dataSource.manager,
      chainType: SOURCE_ID as any as ChainType,
      numberOfConfirmations: () => { return NUMBER_OF_CONFIRMATIONS },
      maxValidIndexerDelaySec: 10,
    } as IndexedQueryManagerOptions;
    indexedQueryManager = new IndexedQueryManager(options);
    let query = indexedQueryManager.entityManager
      .createQueryBuilder(DB_BLOCK_TABLE, "block")
      .where("block.blockNumber = :blockNumber", { blockNumber: BLOCK_CHOICE });
    selectedBlock = await query.getOne();
    let query2 = indexedQueryManager.entityManager
      .createQueryBuilder(DB_TX_TABLE, "transaction")
      .where("transaction.blockNumber = :blockNumber", { blockNumber: BLOCK_CHOICE })
      .andWhere("transaction.paymentReference != :paymentReference", { paymentReference: ZERO_PAYMENT_REFERENCE });
    selectedReferencedTransaction = await query2.getOne();
  });

  it("Should get last confirmed block number", async () => {
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    assert(lastConfirmedBlock > 0);
    // console.log(`Last confirmed block ${lastConfirmedBlock}`);
  });

  it("Should get the correct block greater or equal to timestamp", async () => {
    const timestamp = selectedBlock.timestamp - 20;
    let tmpBlock = await indexedQueryManager.getFirstConfirmedBlockAfterTime(timestamp);
    let currentBlockNumber = tmpBlock.blockNumber;
    while (currentBlockNumber < selectedBlock.blockNumber) {
      const tmpBlockQueryResult = await indexedQueryManager.queryBlock({
        blockNumber: currentBlockNumber,
        roundId: 0,
        confirmed: true,
        windowStartTime: startTime + 5
      });
      tmpBlock = tmpBlockQueryResult.result;
      assert(tmpBlock.timestamp < selectedBlock.timestamp);
      currentBlockNumber++;
    }
  });

  it("Should get the correct block overflow block", async () => {
    const timestamp = selectedBlock.timestamp;
    const tmpBlock = await indexedQueryManager.getFirstConfirmedOverflowBlock(timestamp, selectedBlock.blockNumber);
    assert((tmpBlock.blockNumber = selectedBlock.blockNumber + 1));
    const tmpBlock2 = await indexedQueryManager.getFirstConfirmedOverflowBlock(timestamp, selectedBlock.blockNumber + 2);
    assert((tmpBlock2.blockNumber = selectedBlock.blockNumber + 3));

    const targetTime = timestamp + 20;
    const tmpBlock3 = await indexedQueryManager.getFirstConfirmedOverflowBlock(targetTime, selectedBlock.blockNumber);
    let currentBlockNumber = selectedBlock.blockNumber + 1;
    assert(tmpBlock3.blockNumber > selectedBlock.blockNumber && tmpBlock3.timestamp > targetTime);
    let currentBlockQueryResult = await indexedQueryManager.queryBlock({
      blockNumber: currentBlockNumber,
      roundId: 0,
      confirmed: true,
      windowStartTime: startTime
    });
    while (currentBlockNumber < tmpBlock3.blockNumber) {
      assert(currentBlockQueryResult.result.timestamp <= targetTime);
      currentBlockNumber++;
      currentBlockQueryResult = await indexedQueryManager.queryBlock({
        blockNumber: currentBlockNumber,
        roundId: 0,
        confirmed: true,
        windowStartTime: startTime
      });
    }
    assert(currentBlockQueryResult.result.blockHash === tmpBlock3.blockHash);
  });

  it("Should query transactions by transaction id", async () => {
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    if (!selectedReferencedTransaction) {
      console.log("Probably too little transactions. Run indexer");
    }
    const tmpTransactionsQueryResult = await indexedQueryManager.queryTransactions({
      roundId: 0,
      endBlock: lastConfirmedBlock,
      transactionId: selectedReferencedTransaction.transactionId,
      windowStartTime: startTime
    });
    const tmpTransactions = tmpTransactionsQueryResult.result;
    assert(tmpTransactions.length === 1 && tmpTransactions[0].transactionId === selectedReferencedTransaction.transactionId);
  });

  it("Should query transactions by payment reference", async () => {
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    if (!selectedReferencedTransaction) {
      console.log("Probably too little transactions. Run indexer");
    }
    const tmpTransactionsQueryResult = await indexedQueryManager.queryTransactions({
      roundId: 0,
      endBlock: lastConfirmedBlock,
      transactionId: selectedReferencedTransaction.transactionId,
      windowStartTime: startTime
    });
    assert(tmpTransactionsQueryResult.result.length > 0);
    let found = false;
    for (const tmpTransaction of tmpTransactionsQueryResult.result) {
      if (tmpTransaction.transactionId === selectedReferencedTransaction.transactionId) {
        found = true;
      }
    }
    assert(found);
  });

  // it("Should be able to set last debug confirmed block", async () => {
  //   const offset = 5;
  //   indexedQueryManager.setDebugLastConfirmedBlock(undefined);
  //   const lastConfirmedBlockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();
  //   indexedQueryManager.setDebugLastConfirmedBlock(lastConfirmedBlockNumber - offset);
  //   let newLastConfirmedBlockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();
  //   assert(newLastConfirmedBlockNumber === lastConfirmedBlockNumber - offset);
  //   indexedQueryManager.setDebugLastConfirmedBlock(undefined);
  //   newLastConfirmedBlockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();
  //   assert(newLastConfirmedBlockNumber >= lastConfirmedBlockNumber);
  // });

  it("Should confirmed block queries respect start time", async () => {
    let blockQueryResult = await indexedQueryManager.queryBlock({
      roundId: 1,
      blockNumber: selectedBlock.blockNumber,
      confirmed: true,
      windowStartTime: startTime
    });
    assert(blockQueryResult.result, "Block is not returned by query");
    blockQueryResult = await indexedQueryManager.queryBlock({
      roundId: 1,
      blockNumber: selectedBlock.blockNumber,
      confirmed: true,
      windowStartTime: blockQueryResult.result.timestamp + 1
    });
    assert(!blockQueryResult.result, "Block should not be returned");
  });

  it("Should confirmed transactions queries respect start time and endBlock number", async () => {
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();

    // const selectedReferencedTransaction = (await randomGenerators.get(TxOrBlockGeneratorType.TxGeneral).next()) as DBTransactionBase;
    let transactionsQueryResult = await indexedQueryManager.queryTransactions({
      roundId: 1,
      endBlock: lastConfirmedBlock,
      transactionId: selectedReferencedTransaction.transactionId,
      windowStartTime: startTime
    });
    assert(transactionsQueryResult.result.length === 1, "Transaction is not returned by query");

    const transaction = transactionsQueryResult.result[0];
    transactionsQueryResult = await indexedQueryManager.queryTransactions({
      roundId: 1,
      endBlock: lastConfirmedBlock,
      transactionId: selectedReferencedTransaction.transactionId,
      windowStartTime: transaction.timestamp + 1
    });
    assert(transactionsQueryResult.result.length === 0, "Does not respect start time");

    transactionsQueryResult = await indexedQueryManager.queryTransactions({
      roundId: 1,
      endBlock: transaction.blockNumber - 1,
      transactionId: selectedReferencedTransaction.transactionId,
      windowStartTime: startTime
    });
    assert(transactionsQueryResult.result.length === 0, "Does not respect endBlock");
  });
});
