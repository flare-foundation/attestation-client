// Run tests with the following command lines:

import { ChainType, MCC } from "@flarenetwork/mcc";
import { assert } from "chai";
import { DataSource, DataSourceOptions } from "typeorm";
import { DBBlockBase, DBBlockXRP } from "../../src/entity/indexer/dbBlock";
import { DBTransactionBase, DBTransactionXRP0 } from "../../src/entity/indexer/dbTransaction";
import { IndexedQueryManager } from "../../src/indexed-query-manager/IndexedQueryManager";
import { IndexedQueryManagerOptions } from "../../src/indexed-query-manager/indexed-query-manager-types";
import { TxOrBlockGeneratorType, prepareGenerator, prepareRandomGenerators } from "../../src/indexed-query-manager/random-attestation-requests/random-ar";
import { RandomDBIterator } from "../../src/indexed-query-manager/random-attestation-requests/random-query";
import { createTypeOrmOptions } from "../../src/servers/verifier-server/src/utils/db-config";
import { getUnixEpochTimestamp } from "../../src/utils/helpers/utils";
import { generateTestIndexerDB } from "./utils/indexerTestDataGenerator";

const CHAIN_TYPE = MCC.getChainType(process.env.SOURCE_ID) ?? ChainType.XRP;
const NUMBER_OF_CONFIRMATIONS = 1;
const BATCH_SIZE = 100;
const TOP_UP_THRESHOLD = 0.25;
const FIRST_BLOCK = 100;
const LAST_BLOCK = 203;
const LAST_CONFIRMED_BLOCK = 200;

console.warn(`Overriding DOTENV=DEV, NODE_ENV=development`);
process.env.DOTENV = "DEV";
process.env.NODE_ENV = "development";
process.env.VERIFIER_TYPE = "xrp"
process.env.TEST_CREDENTIALS = "1";

describe("Indexed query manager", () => {
  let indexedQueryManager: IndexedQueryManager;
  let randomGenerators: Map<TxOrBlockGeneratorType, RandomDBIterator<DBTransactionBase | DBBlockBase>>;

  before(async () => {
    let dbOptions = await createTypeOrmOptions("test");
    let dataSource = new DataSource(dbOptions as DataSourceOptions);
    await dataSource.initialize();
    await generateTestIndexerDB(
      ChainType.XRP,
      dataSource.manager,
      DBBlockXRP,
      DBTransactionXRP0,
      FIRST_BLOCK,
      LAST_BLOCK,
      getUnixEpochTimestamp(),
      LAST_CONFIRMED_BLOCK,
      5
    );

    const options: IndexedQueryManagerOptions = {
      entityManager: dataSource.manager,
      chainType: CHAIN_TYPE,
      numberOfConfirmations: () => { return NUMBER_OF_CONFIRMATIONS },
    } as IndexedQueryManagerOptions;
    indexedQueryManager = new IndexedQueryManager(options);

    randomGenerators = await prepareRandomGenerators(indexedQueryManager, BATCH_SIZE, TOP_UP_THRESHOLD);    
  });

  it("Prepare generator", async () => {
    console.time("XXX");
    const gen = await prepareGenerator(TxOrBlockGeneratorType.TxReferenced, indexedQueryManager, BATCH_SIZE, TOP_UP_THRESHOLD);
    await gen.next();
    console.timeEnd("XXX");
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

});
