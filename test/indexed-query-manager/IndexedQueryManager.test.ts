
import { ChainType, unPrefix0x } from "@flarenetwork/mcc";
import { assert } from "chai";
import { DataSource, DataSourceOptions } from "typeorm";
import { DBBlockBase, DBBlockXRP } from "../../src/entity/indexer/dbBlock";
import { DBTransactionBase, DBTransactionXRP0 } from "../../src/entity/indexer/dbTransaction";
import { IndexedQueryManagerOptions } from "../../src/indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../../src/indexed-query-manager/IndexedQueryManager";
import { createTypeOrmOptions } from "../../src/servers/verifier-server/src/utils/db-config";
import { getUnixEpochTimestamp } from "../../src/utils/helpers/utils";
import { toHex } from "../../src/verification/attestation-types/attestation-types-helpers";
import { SourceId } from "../../src/verification/sources/sources";
import { getTestFile } from "../test-utils/test-utils";
import { changeTimestampT, generateTestIndexerDB, selectBlock, selectedReferencedTx, snapshotTimestampT, ZERO_PAYMENT_REFERENCE } from "./utils/indexerTestDataGenerator";

// XRP
const SOURCE_ID = SourceId.XRP;
// To setup the correct entities in the database

const NUMBER_OF_CONFIRMATIONS = 1;
const FIRST_BLOCK = 100;
const LAST_BLOCK = 203;
const LAST_CONFIRMED_BLOCK = 200;
const CHAIN_TYPE = ChainType.XRP;
const DB_BLOCK_TABLE = DBBlockXRP;
const DB_TX_TABLE = DBTransactionXRP0;
const BLOCK_CHOICE = 150;
const TXS_IN_BLOCK = 10;
const SECURE_CONFIG_PATH = "./test/indexed-query-manager/test-data"

describe(`Indexed query manager (${getTestFile(__filename)})`, () => {
  let indexedQueryManager: IndexedQueryManager;
  let startTime = 0;
  let selectedBlock: DBBlockBase;
  let selectedReferencedTransaction: DBTransactionBase;
  let lastTimestamp: number = 0;
  let dataSource: DataSource;

  before(async () => {
    process.env.VERIFIER_TYPE = "xrp"
    process.env.TEST_CREDENTIALS = "1";
    process.env.SECURE_CONFIG_PATH = SECURE_CONFIG_PATH;
    
    let dbOptions = await createTypeOrmOptions("test");
    dataSource = new DataSource(dbOptions as DataSourceOptions);
    await dataSource.initialize();
    lastTimestamp = getUnixEpochTimestamp();
    await generateTestIndexerDB(
      CHAIN_TYPE,
      dataSource.manager,
      DB_BLOCK_TABLE,
      DB_TX_TABLE,
      FIRST_BLOCK,
      LAST_BLOCK,
      lastTimestamp,
      LAST_CONFIRMED_BLOCK,
      TXS_IN_BLOCK,
      lastTimestamp
    );
    startTime = lastTimestamp - (LAST_BLOCK - FIRST_BLOCK);

    const options: IndexedQueryManagerOptions = {
      entityManager: dataSource.manager,
      chainType: SOURCE_ID as any as ChainType,
      numberOfConfirmations: () => { return NUMBER_OF_CONFIRMATIONS },
      maxValidIndexerDelaySec: 10,
    } as IndexedQueryManagerOptions;
    indexedQueryManager = new IndexedQueryManager(options);

    selectedBlock = await selectBlock(dataSource.manager, DB_BLOCK_TABLE, BLOCK_CHOICE);
    selectedReferencedTransaction = await selectedReferencedTx(dataSource.manager, DB_TX_TABLE, BLOCK_CHOICE)
  });

  it("Should referenced transaction have proper reference", async () => {
    assert(selectedReferencedTransaction.paymentReference?.length === 64)
    assert(selectedReferencedTransaction.paymentReference !== ZERO_PAYMENT_REFERENCE);
  });

  it("Should get last confirmed block number", async () => {
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    assert(lastConfirmedBlock === LAST_CONFIRMED_BLOCK);
    // console.log(`Last confirmed block ${lastConfirmedBlock}`);
  });

  it("Should get latest block timestamp", async () => {
    const response = await indexedQueryManager.getLatestBlockTimestamp();
    assert(response.timestamp === lastTimestamp);
    assert(response.height === LAST_BLOCK);
  });

  it("Should indexer be up to date", async () => {
    const response = await indexedQueryManager.isIndexerUpToDate();
    assert(response);
  });


  it("Should get the correct block greater or equal to timestamp", async () => {
    const timestamp = selectedBlock.timestamp - 20;
    let tmpBlock = await indexedQueryManager.getFirstConfirmedBlockAfterTime(timestamp);
    let currentBlockNumber = tmpBlock.blockNumber;
    while (currentBlockNumber < selectedBlock.blockNumber) {
      const tmpBlockQueryResult = await indexedQueryManager.queryBlock({
        blockNumber: currentBlockNumber,
        confirmed: true,
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
      confirmed: true,
    });
    while (currentBlockNumber < tmpBlock3.blockNumber) {
      assert(currentBlockQueryResult.result.timestamp <= targetTime);
      currentBlockNumber++;
      currentBlockQueryResult = await indexedQueryManager.queryBlock({
        blockNumber: currentBlockNumber,
        confirmed: true,
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
      endBlockNumber: lastConfirmedBlock,
      transactionId: selectedReferencedTransaction.transactionId,
    });
    const tmpTransactions = tmpTransactionsQueryResult.result;
    assert(tmpTransactions.length === 1 && tmpTransactions[0].transactionId === selectedReferencedTransaction.transactionId);
  });
  
  it("Should query transactions by payment reference and return boundary blocks", async () => {
    const lastConfirmedBlockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();
    if (!selectedReferencedTransaction) {
      console.log("Probably too little transactions. Run indexer");
    }
    const lowerBoundaryBlockNumber = selectedReferencedTransaction.blockNumber - 10
    const tmpTransactionsQueryResult = await indexedQueryManager.queryTransactions({
      startBlockNumber: lowerBoundaryBlockNumber,
      endBlockNumber: lastConfirmedBlockNumber,
      paymentReference: selectedReferencedTransaction.paymentReference,
    });
    assert(tmpTransactionsQueryResult.result.length > 0, "No transactions found");
    let found = false;
    for (const tmpTransaction of tmpTransactionsQueryResult.result) {
      if (tmpTransaction.transactionId === selectedReferencedTransaction.transactionId) {
        found = true;
      }
    }
    assert(found, "Transaction not found");    
    assert(tmpTransactionsQueryResult.startBlock?.blockNumber === lowerBoundaryBlockNumber, "Lower bound does not match");
    assert(tmpTransactionsQueryResult.endBlock?.blockNumber === lastConfirmedBlockNumber, "Upper bound does not match");
  });

  it("Should return block by hash", async () => {
    let result = await indexedQueryManager.getBlockByHash(selectedBlock.blockHash);
    assert(result.blockNumber === selectedBlock.blockNumber, "Wrong block found")
  });

  it("Should confirmed transactions queries respect startBlock and endBlock number", async () => {
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();

    // const selectedReferencedTransaction = (await randomGenerators.get(TxOrBlockGeneratorType.TxGeneral).next()) as DBTransactionBase;
    let transactionsQueryResult = await indexedQueryManager.queryTransactions({
      endBlockNumber: lastConfirmedBlock,
      transactionId: selectedReferencedTransaction.transactionId,
    });
    assert(transactionsQueryResult.result.length === 1, "Transaction is not returned by query");

    const transaction = transactionsQueryResult.result[0];
    transactionsQueryResult = await indexedQueryManager.queryTransactions({
      startBlockNumber: selectedReferencedTransaction.blockNumber + 1,
      endBlockNumber: lastConfirmedBlock,      
      transactionId: selectedReferencedTransaction.transactionId,      
    });
    assert(transactionsQueryResult.result.length === 0, "Does not respect start block");

    transactionsQueryResult = await indexedQueryManager.queryTransactions({
      endBlockNumber: transaction.blockNumber - 1,
      transactionId: selectedReferencedTransaction.transactionId,
    });
    assert(transactionsQueryResult.result.length === 0, "Does not respect endBlock");
  });

  it("Should succeed in getting a confirmed block", async () => {
    const confirmedBlockQueryResult = await indexedQueryManager.getConfirmedBlock({
      blockNumber: selectedBlock.blockNumber,
    });
    assert(confirmedBlockQueryResult.status === 'OK', "Wrong status");
    assert(confirmedBlockQueryResult.block.blockHash === unPrefix0x(selectedBlock.blockHash));
  });

  it("Should get referenced transactions", async () => {
    let selectedBlock = await selectBlock(dataSource.manager, DB_BLOCK_TABLE, LAST_CONFIRMED_BLOCK - 10);
    
    const deadlineBlockNumber = selectedBlock.blockNumber + 1;
    const deadlineBlockTimestamp = selectedBlock.timestamp + 2;
    const resp = await indexedQueryManager.getReferencedTransactions({
      minimalBlockNumber: FIRST_BLOCK,
      deadlineBlockNumber,
      deadlineBlockTimestamp, 
      paymentReference: selectedReferencedTransaction.paymentReference,
    });
    assert(resp.status === 'OK', "Wrong status");
    assert(resp.transactions.length === 1, "More than one transaction");
    assert(resp.transactions[0].transactionId === selectedReferencedTransaction.transactionId, "Transaction id does not match");
    assert(resp.minimalBlock.blockNumber === FIRST_BLOCK, "Wrong lower boundary block number");
    assert(resp.firstOverflowBlock.blockNumber === deadlineBlockNumber + 2, "Wrong first overflow block number");
    assert(resp.firstOverflowBlock.timestamp === deadlineBlockTimestamp + 1, "First overflow block timestamp too small");
  });
});




