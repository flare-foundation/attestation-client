// Run tests with the following command lines:
// Make sure that you are connected to a synced database and indexers are running
//
// SOURCE_ID=XRP DOTENV_INCLUDE=".indexer.remote.dev.read.env" yarn hardhat test test/IndexedQueryManager.test.ts
// SOURCE_ID=BTC DOTENV_INCLUDE=".indexer.remote.dev.read.env" yarn hardhat test test/IndexedQueryManager.test.ts
// SOURCE_ID=LTC DOTENV_INCLUDE=".indexer.remote.dev.read.env" yarn hardhat test test/IndexedQueryManager.test.ts
// SOURCE_ID=DOGE DOTENV_INCLUDE=".indexer.remote.dev.read.env" yarn hardhat test test/IndexedQueryManager.test.ts
// SOURCE_ID=ALGO DOTENV_INCLUDE=".indexer.remote.dev.read.env" yarn hardhat test test/IndexedQueryManager.test.ts

import { assert } from "chai";
import { MccClient } from "@flarenetwork/mcc";
import { RandomDBIterator } from "../../lib/indexed-query-manager/random-attestation-requests/random-query";
import { IndexedQueryManager } from "../../lib/indexed-query-manager/IndexedQueryManager";
import { prepareGenerator, TxOrBlockGeneratorType } from "../../lib/indexed-query-manager/random-attestation-requests/random-ar";
import { IndexerConfiguration } from "../../lib/indexer/IndexerConfiguration";
import { DotEnvExt } from "../../lib/utils/DotEnvExt";
import { getSourceName, SourceId } from "../../lib/verification/sources/sources";
import { DBBlockBase } from "../../lib/entity/indexer/dbBlock";
import { DBTransactionBase } from "../../lib/entity/indexer/dbTransaction";

const SOURCE_ID = SourceId[process.env.SOURCE_ID] ?? SourceId.XRP;
const MINUTES = 60;
const HISTORY_WINDOW = 5 * MINUTES;
const NUMBER_OF_CONFIRMATIONS = 1;
const BATCH_SIZE = 100;
const TOP_UP_THRESHOLD = 0.25;

console.warn(`This test should run while ${getSourceName(SOURCE_ID)} indexer is running`);
// Overriding .env variables for this particular test only
console.warn(`Overriding DOTENV=DEV, NODE_ENV=development`);
process.env.DOTENV = "DEV";
process.env.NODE_ENV = "development";
DotEnvExt();

describe("Indexed query manager", () => {
  let indexedQueryManager: IndexedQueryManager;
  let client: MccClient;
  let indexerConfiguration: IndexerConfiguration;
  let chainName: string;
  let startTime = 0;
  let randomGenerators: Map<TxOrBlockGeneratorType, RandomDBIterator<DBTransactionBase | DBBlockBase>>;

  before(async () => {
    // INFO: chains is no longer in indexerConfig - it is in chainsConfig
    // indexerConfiguration = null;//indexerConfig as IndexerConfiguration
    // chainName = getSourceName(SOURCE_ID);
    // let chainConfiguration = indexerConfig.chains.find(chain => chain.name === chainName);
    // client = MCC.Client(SOURCE_ID, {
    //    ...chainConfiguration.mccCreate,
    //    rateLimitOptions: chainConfiguration.rateLimitOptions
    // }) as MccClient;
    // //  startTime = Math.floor(Date.now()/1000) - HISTORY_WINDOW;
    // NUMBER_OF_CONFIRMATIONS = chainConfiguration.numberOfConfirmations
    // const options: IndexedQueryManagerOptions = {
    //    chainType: SOURCE_ID as any as ChainType,
    //    numberOfConfirmations: ()=>{return NUMBER_OF_CONFIRMATIONS},
    //    maxValidIndexerDelaySec: 10,
    //    // todo: return epochStartTime - query window length, add query window length into DAC
    //    windowStartTime: (roundId: number) => { return startTime; }
    // } as IndexedQueryManagerOptions;
    // indexedQueryManager = new IndexedQueryManager(options);
    // await indexedQueryManager.dbService.waitForDBConnection();
    // randomGenerators = await prepareRandomGenerators(indexedQueryManager, BATCH_SIZE, TOP_UP_THRESHOLD);
  });

  it("Prepare generator", async () => {
    console.time("XXX");
    const gen = await prepareGenerator(TxOrBlockGeneratorType.TxReferenced, indexedQueryManager, BATCH_SIZE, TOP_UP_THRESHOLD);
    await gen.next();
    console.timeEnd("XXX");
  });

  it("Should get last confirmed block number", async () => {
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    assert(lastConfirmedBlock > 0);
    // console.log(`Last confirmed block ${lastConfirmedBlock}`);
  });

  it("Should get a random confirmed transaction", async () => {
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    const randomTransaction = await randomGenerators.get(TxOrBlockGeneratorType.TxGeneral).next();
    assert(randomTransaction && randomTransaction.blockNumber && randomTransaction.blockNumber <= lastConfirmedBlock);
  });

  it("Should get two different random transactions with payment reference", async () => {
    let maxReps = 5;
    // Checking for two transactions to verify "randomness"
    while (true) {
      const randomTransaction1 = (await randomGenerators.get(TxOrBlockGeneratorType.TxReferenced).next()) as DBTransactionBase;
      const randomTransaction2 = (await randomGenerators.get(TxOrBlockGeneratorType.TxReferenced).next()) as DBTransactionBase;

      if (!randomTransaction1 || !randomTransaction1) {
        console.log("Probably empty tables of transactions. Run indexer.");
        return;
      }
      assert(randomTransaction1.paymentReference.length > 0);
      assert(randomTransaction2.paymentReference.length > 0);
      if (randomTransaction1.paymentReference === randomTransaction2.paymentReference) {
        maxReps--;
        if (maxReps === 0) {
          console.log("Too little transactions. Random choices repeat too often.");
        }
        continue;
      }
      break;
    }
  });

  it("Should get random native payment transaction with reference", async () => {
    const randomTransaction = (await randomGenerators.get(TxOrBlockGeneratorType.TxReferenced).next()) as DBTransactionBase;
    if (randomTransaction) {
      assert(randomTransaction.isNativePayment, "Not native payment");
      assert(randomTransaction.paymentReference.length > 0, "Should have payment reference");
    }
  });

  // it("Should get random non native payment transaction with reference", async () => {
  //    let randomTransaction = await getRandomTransactionWithPaymentReference(indexedQueryManager, false, true);
  //    if (randomTransaction) {
  //       assert(!randomTransaction.isNativePayment, "Should not be native payment")
  //       if (SOURCE_ID === SourceId.XRP) {
  //          assert(randomTransaction.paymentReference.length > 0, "Should have payment reference");
  //       }
  //    }
  // })

  it("Should get a random confirmed block", async () => {
    let maxReps = 5;
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    while (true) {
      const randomBlock1 = (await randomGenerators.get(TxOrBlockGeneratorType.BlockConfirmed).next()) as DBBlockBase;
      const randomBlock2 = (await randomGenerators.get(TxOrBlockGeneratorType.BlockConfirmed).next()) as DBBlockBase;
      if (!randomBlock1 || !randomBlock2) {
        console.log("Probably empty table of blocks. Run indexer");
        return;
      }
      assert(randomBlock1.blockNumber <= lastConfirmedBlock, "randomBlock1 above last confirmed block");
      assert(randomBlock2.blockNumber <= lastConfirmedBlock, "randomBlock2 above last confirmed block");
      if (randomBlock1.blockNumber === randomBlock2.blockNumber) {
        maxReps--;
        if (maxReps === 0) {
          console.log("Too little blocks. Random choices repeat too often");
        }
        continue;
      } else {
        break;
      }
    }
  });

  it("Should get the correct block greater or equal to timestamp", async () => {
    startTime = 0;
    const randomBlock = (await randomGenerators.get(TxOrBlockGeneratorType.BlockConfirmed).next()) as DBBlockBase;
    const timestamp = randomBlock.timestamp - 20;
    let tmpBlock = await indexedQueryManager.getFirstConfirmedBlockAfterTime(timestamp);
    let currentBlockNumber = tmpBlock.blockNumber;
    while (currentBlockNumber < randomBlock.blockNumber) {
      const tmpBlockQueryResult = await indexedQueryManager.queryBlock({ blockNumber: currentBlockNumber, roundId: 0, confirmed: true });
      tmpBlock = tmpBlockQueryResult.result;
      assert(tmpBlock.timestamp < randomBlock.timestamp);
      currentBlockNumber++;
    }
  });

  it("Should get the correct block overflow block", async () => {
    startTime = 0;
    const randomBlock = (await randomGenerators.get(TxOrBlockGeneratorType.BlockConfirmed).next()) as DBBlockBase;
    const timestamp = randomBlock.timestamp;
    const tmpBlock = await indexedQueryManager.getFirstConfirmedOverflowBlock(timestamp, randomBlock.blockNumber);
    assert((tmpBlock.blockNumber = randomBlock.blockNumber + 1));
    const tmpBlock2 = await indexedQueryManager.getFirstConfirmedOverflowBlock(timestamp, randomBlock.blockNumber + 2);
    assert((tmpBlock2.blockNumber = randomBlock.blockNumber + 3));

    const targetTime = timestamp + 20;
    const tmpBlock3 = await indexedQueryManager.getFirstConfirmedOverflowBlock(targetTime, randomBlock.blockNumber);
    let currentBlockNumber = randomBlock.blockNumber + 1;
    assert(tmpBlock3.blockNumber > randomBlock.blockNumber && tmpBlock3.timestamp > targetTime);
    let currentBlockQueryResult = await indexedQueryManager.queryBlock({ blockNumber: currentBlockNumber, roundId: 0, confirmed: true });
    while (currentBlockNumber < tmpBlock3.blockNumber) {
      assert(currentBlockQueryResult.result.timestamp <= targetTime);
      currentBlockNumber++;
      currentBlockQueryResult = await indexedQueryManager.queryBlock({ blockNumber: currentBlockNumber, roundId: 0, confirmed: true });
    }
    assert(currentBlockQueryResult.result.blockHash === tmpBlock3.blockHash);
  });

  it("Should query transactions by transaction id", async () => {
    startTime = 0;
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    const randomTransaction = (await randomGenerators.get(TxOrBlockGeneratorType.TxReferenced).next()) as DBTransactionBase;
    if (!randomTransaction) {
      console.log("Probably too little transactions. Run indexer");
    }
    const tmpTransactionsQueryResult = await indexedQueryManager.queryTransactions({
      roundId: 0,
      endBlock: lastConfirmedBlock,
      transactionId: randomTransaction.transactionId,
    });
    const tmpTransactions = tmpTransactionsQueryResult.result;
    assert(tmpTransactions.length === 1 && tmpTransactions[0].transactionId === randomTransaction.transactionId);
  });

  it("Should query transactions by payment reference", async () => {
    startTime = 0;
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    const randomTransaction = (await randomGenerators.get(TxOrBlockGeneratorType.TxReferenced).next()) as DBTransactionBase;
    if (!randomTransaction) {
      console.log("Probably too little transactions. Run indexer");
    }
    const tmpTransactionsQueryResult = await indexedQueryManager.queryTransactions({
      roundId: 0,
      endBlock: lastConfirmedBlock,
      transactionId: randomTransaction.transactionId,
    });
    assert(tmpTransactionsQueryResult.result.length > 0);
    let found = false;
    for (const tmpTransaction of tmpTransactionsQueryResult.result) {
      if (tmpTransaction.transactionId === randomTransaction.transactionId) {
        found = true;
      }
    }
    assert(found);
  });

  it("Should be able to set last debug confirmed block", async () => {
    const offset = 5;
    indexedQueryManager.setDebugLastConfirmedBlock(undefined);
    const lastConfirmedBlockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();
    indexedQueryManager.setDebugLastConfirmedBlock(lastConfirmedBlockNumber - offset);
    let newLastConfirmedBlockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();
    assert(newLastConfirmedBlockNumber === lastConfirmedBlockNumber - offset);
    indexedQueryManager.setDebugLastConfirmedBlock(undefined);
    newLastConfirmedBlockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();
    assert(newLastConfirmedBlockNumber >= lastConfirmedBlockNumber);
  });

  it("Should confirmed block queries respect start time", async () => {
    startTime = 0;
    const randomConfirmedBlock = (await randomGenerators.get(TxOrBlockGeneratorType.BlockConfirmed).next()) as DBBlockBase;
    let blockQueryResult = await indexedQueryManager.queryBlock({
      roundId: 1,
      blockNumber: randomConfirmedBlock.blockNumber,
      confirmed: true,
    });
    assert(blockQueryResult, "Block is not returned by query");
    startTime = blockQueryResult.result.timestamp + 1;
    blockQueryResult = await indexedQueryManager.queryBlock({
      roundId: 1,
      blockNumber: randomConfirmedBlock.blockNumber,
      confirmed: true,
    });
    assert(!blockQueryResult);
  });

  it("Should confirmed transactions queries respect start time and endBlock number", async () => {
    startTime = 0;
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();

    const randomTransaction = (await randomGenerators.get(TxOrBlockGeneratorType.TxGeneral).next()) as DBTransactionBase;
    let transactionsQueryResult = await indexedQueryManager.queryTransactions({
      roundId: 1,
      endBlock: lastConfirmedBlock,
      transactionId: randomTransaction.transactionId,
    });
    assert(transactionsQueryResult.result.length === 1, "Transaction is not returned by query");

    const transaction = transactionsQueryResult[0];
    startTime = transaction.timestamp + 1;
    transactionsQueryResult = await indexedQueryManager.queryTransactions({
      roundId: 1,
      endBlock: lastConfirmedBlock,
      transactionId: randomTransaction.transactionId,
    });
    assert(transactionsQueryResult.result.length === 0, "Does not respect start time");

    startTime = 0;
    transactionsQueryResult = await indexedQueryManager.queryTransactions({
      roundId: 1,
      endBlock: transaction.blockNumber - 1,
      transactionId: randomTransaction.transactionId,
    });
    assert(transactionsQueryResult.result.length === 0, "Does not respect endBlock");
  });
});
