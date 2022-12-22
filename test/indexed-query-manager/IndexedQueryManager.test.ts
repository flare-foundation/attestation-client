
import { ChainType, unPrefix0x } from "@flarenetwork/mcc";
import { assert } from "chai";
import { DataSource, DataSourceOptions } from "typeorm";
import { DBBlockBase, DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { DBTransactionBase, DBTransactionXRP0 } from "../../lib/entity/indexer/dbTransaction";
import { IndexedQueryManagerOptions } from "../../lib/indexed-query-manager/indexed-query-manager-types";
import { IndexedQueryManager } from "../../lib/indexed-query-manager/IndexedQueryManager";
import { createTypeOrmOptions } from "../../lib/servers/verifier-server/src/utils/db-config";
import { getUnixEpochTimestamp } from "../../lib/utils/utils";
import { toHex } from "../../lib/verification/attestation-types/attestation-types-helpers";
import { SourceId } from "../../lib/verification/sources/sources";
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



describe(`Indexed query manager (${getTestFile(__filename)})`, () => {
  let indexedQueryManager: IndexedQueryManager;
  let startTime = 0;
  let selectedBlock: DBBlockBase;
  let selectedReferencedTransaction: DBTransactionBase;
  let lastTimestamp: number = 0;
  let dataSource: DataSource;

  before(async () => {
    process.env.VERIFIER_TYPE = "xrp"
    process.env.IN_MEMORY_DB = "1";
    
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
  
  it("Should query transactions by payment reference and return boundary blocks", async () => {
    const lastConfirmedBlock = await indexedQueryManager.getLastConfirmedBlockNumber();
    if (!selectedReferencedTransaction) {
      console.log("Probably too little transactions. Run indexer");
    }
    const tmpTransactionsQueryResult = await indexedQueryManager.queryTransactions({
      roundId: 0,
      endBlock: lastConfirmedBlock,
      paymentReference: selectedReferencedTransaction.paymentReference,
      windowStartTime: startTime + 10,
      returnQueryBoundaryBlocks: true
    });
    assert(tmpTransactionsQueryResult.result.length > 0);
    let found = false;
    for (const tmpTransaction of tmpTransactionsQueryResult.result) {
      if (tmpTransaction.transactionId === selectedReferencedTransaction.transactionId) {
        found = true;
      }
    }
    assert(found);
    assert(tmpTransactionsQueryResult.lowerQueryWindowBlock?.blockNumber === 110, "Lower bound does not match");
    assert(tmpTransactionsQueryResult.upperQueryWindowBlock?.blockNumber === 200, "Upper bound does not match");
  });

  
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

  it("Should query confirmed block by hash and return boundaries", async () => {
    let blockQueryResult = await indexedQueryManager.queryBlock({
      roundId: 1,
      hash: selectedBlock.blockHash,
      confirmed: true,
      windowStartTime: startTime + 10,
    });
    assert(blockQueryResult.result.blockHash === selectedBlock.blockHash, "Wrong block found");
    assert(!blockQueryResult.lowerQueryWindowBlock, "Lower bound should not be present");
    assert(!blockQueryResult.upperQueryWindowBlock, "Upper bound should not be present");
    blockQueryResult = await indexedQueryManager.queryBlock({
      roundId: 1,
      hash: selectedBlock.blockHash,
      confirmed: true,
      windowStartTime: startTime + 10,
      returnQueryBoundaryBlocks: true
    });
    assert(blockQueryResult.result.blockHash === selectedBlock.blockHash, "Wrong block found");
    assert(blockQueryResult.lowerQueryWindowBlock?.blockNumber === 110, "Lower bound does not match");
    assert(blockQueryResult.upperQueryWindowBlock?.blockNumber === selectedBlock.blockNumber, "Upper bound does not match");
  });


  it("Should return block by hash", async () => {
    let result = await indexedQueryManager.getBlockByHash(selectedBlock.blockHash);
    assert(result.blockNumber === selectedBlock.blockNumber, "Wrong block found")
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

  it("Should succeed in getting a confirmed block", async () => {
    const confirmedBlockQueryResult = await indexedQueryManager.getConfirmedBlock({
      upperBoundProof: selectedBlock.blockHash,
      roundId: 1,
      type: "FIRST_CHECK",    
      windowStartTime: startTime + 1,
      UBPCutoffTime: startTime + 1,
      returnQueryBoundaryBlocks: true,
    });
    assert(confirmedBlockQueryResult.status === 'OK', "Wrong status");
    assert(confirmedBlockQueryResult.block.blockHash === unPrefix0x(selectedBlock.blockHash));
    assert(confirmedBlockQueryResult.lowerBoundaryBlock?.blockNumber === 101);
    assert(confirmedBlockQueryResult.upperBoundaryBlock?.blockNumber === selectedBlock.blockNumber)    
  });

  it("Should fail getting unconfirmed block", async () => {
    let selectedBlock2 = await selectBlock(indexedQueryManager.entityManager, DB_BLOCK_TABLE, LAST_BLOCK);
    let confirmedBlockQueryResult = await indexedQueryManager.getConfirmedBlock({
      upperBoundProof: selectedBlock2.blockHash,
      roundId: 1,
      type: "FIRST_CHECK",    
      windowStartTime: startTime + 1,
      UBPCutoffTime: startTime + 1,
    });
    assert(confirmedBlockQueryResult.status === "RECHECK");
    confirmedBlockQueryResult = await indexedQueryManager.getConfirmedBlock({
      upperBoundProof: selectedBlock2.blockHash,
      roundId: 1,
      type: "RECHECK",    
      windowStartTime: startTime + 1,
      UBPCutoffTime: startTime + 1,
    });
    // gap is bigger then number of confirmations
    assert(confirmedBlockQueryResult.status === "SYSTEM_FAILURE");
  });

  it("Should fail to check upper boundary", async () => {
    let resp = await indexedQueryManager.getConfirmedBlock({
      upperBoundProof: toHex(1, 32),
      roundId: 1,
      type: "FIRST_CHECK",    
      windowStartTime: startTime + 1,
      UBPCutoffTime: startTime + 1,
    });
    assert(resp.status === "RECHECK");
    resp = await indexedQueryManager.getConfirmedBlock({
      upperBoundProof: toHex(1, 32),
      roundId: 1,
      type: "RECHECK",    
      windowStartTime: startTime + 1,
      UBPCutoffTime: startTime + 1,
    });
    assert(resp.status === "NO_BOUNDARY");
    let previousTimestamp = await snapshotTimestampT(dataSource.manager, CHAIN_TYPE);
    await changeTimestampT(dataSource.manager, CHAIN_TYPE, previousTimestamp + 20);
    resp = await indexedQueryManager.getConfirmedBlock({
      upperBoundProof: toHex(1, 32),
      roundId: 1,
      type: "RECHECK",    
      windowStartTime: startTime + 1,
      UBPCutoffTime: startTime + 1,
    });
    assert(resp.status === "SYSTEM_FAILURE");
    await changeTimestampT(dataSource.manager, CHAIN_TYPE, previousTimestamp);
  });

  it("Should get referenced transactions", async () => {
    let selectedBlock = await selectBlock(dataSource.manager, DB_BLOCK_TABLE, LAST_CONFIRMED_BLOCK - 10);
    let upperBoundBlock = await selectBlock(dataSource.manager, DB_BLOCK_TABLE, LAST_CONFIRMED_BLOCK - 5);

    const resp = await indexedQueryManager.getReferencedTransactions({
      deadlineBlockNumber: selectedBlock.blockNumber + 1,
      deadlineBlockTimestamp: selectedBlock.timestamp + 2,
      paymentReference: selectedReferencedTransaction.paymentReference,
      upperBoundProof: upperBoundBlock.blockHash,
      roundId: 1,
      type: "FIRST_CHECK",
      windowStartTime: startTime + 1,
      UBPCutoffTime: startTime + 1,
    });
    assert(resp.status === 'OK');
    assert(resp.transactions.length === 1);
    assert(resp.transactions[0].transactionId === selectedReferencedTransaction.transactionId);
    assert(resp.lowerBoundaryBlock.blockNumber === FIRST_BLOCK + 1);
    assert(resp.firstOverflowBlock.blockNumber === LAST_CONFIRMED_BLOCK - 10 + 3);
    assert(resp.firstOverflowBlock.blockNumber > selectedBlock.blockNumber + 1);
    assert(resp.firstOverflowBlock.timestamp > selectedBlock.timestamp + 2);
  });
});




