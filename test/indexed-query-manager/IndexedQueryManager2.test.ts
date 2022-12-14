import { IndexedQueryManager } from "../../lib/indexed-query-manager/IndexedQueryManager";
import { BlockQueryParams, IndexedQueryManagerOptions, TransactionQueryParams } from "../../lib/indexed-query-manager/indexed-query-manager-types";
import { ChainType, round, UtxoBlock } from "@flarenetwork/mcc";
import { DatabaseService, DatabaseConnectOptions } from "../../lib/utils/databaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { expect } from "chai";
import { DBState } from "../../lib/entity/indexer/dbState";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import { augmentBlock } from "../../lib/indexer/chain-collector-helpers/augmentBlock";
import { DBBlockBTC } from "../../lib/entity/indexer/dbBlock";
import sinon from "sinon";
import { DBTransactionBase } from "../../lib/entity/indexer/dbTransaction";
import { promAugTxBTC0, promAugTxBTC1, promAugTxBTCALt0, promAugTxBTCAlt1 } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";

describe(`IndexedQueryManager (${getTestFile(__filename)})`, () => {
  const databaseConnectOptions = new DatabaseConnectOptions();
  databaseConnectOptions.database = process.env.DATABASE_NAME2;
  databaseConnectOptions.username = process.env.DATABASE_USERNAME;
  databaseConnectOptions.password = process.env.DATBASE_PASS;
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions);

  const options: IndexedQueryManagerOptions = {
    chainType: ChainType.BTC,
    dbService: dataService,
    numberOfConfirmations: () => 5,
    maxValidIndexerDelaySec: 10,
    windowStartTime: (roundId: number) => roundId * 5,
    UBPCutoffTime: (roundId: number) => roundId * 5 + 4,
  };

  const indexedQueryManager = new IndexedQueryManager(options);

  let augTx0: DBTransactionBase;
  let augTxAlt0: DBTransactionBase;
  let augTx1: DBTransactionBase;
  let augTxAlt1: DBTransactionBase;

  before(async () => {
    initializeTestGlobalLogger();
    await dataService.connect();
    augTx0 = await promAugTxBTC0;
    augTxAlt0 = await promAugTxBTCALt0;
    augTx1 = await promAugTxBTC1;
    augTxAlt1 = await promAugTxBTCAlt1;

    //start with empty tables
    for (let i = 0; i < 2; i++) {
      const tableName = `btc_transactions${i}`;
      await dataService.manager.query(`TRUNCATE ${tableName};`);
    }

    const tableName = "btc_block";
    await dataService.manager.query(`TRUNCATE ${tableName};`);
  });

  it("Should get chain N ", () => {
    expect(indexedQueryManager.getChainN()).to.be.eq("BTC_N");
  });
  it("Should get chain T ", () => {
    expect(indexedQueryManager.getChainT()).to.be.eq("BTC_T");
  });

  it("Should not getLastConfirmedBlockNumber", async () => {
    await dataService.manager.delete(DBState, { name: "BTC_N" });

    const blockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();
    expect(blockNumber).to.be.eq(0);
  });

  it("Should getLastConfirmedBlockNumber", async () => {
    const state = new DBState();
    state.name = "BTC_N";
    state.valueNumber = 12;
    await dataService.manager.save(state);

    const blockNumber = await indexedQueryManager.getLastConfirmedBlockNumber();
    expect(blockNumber).to.be.eq(12);
  });

  it("Should not getLatestBlockTimestamp", async () => {
    await dataService.manager.delete(DBState, { name: "BTC_T" });

    const blockTimestamp = await indexedQueryManager.getLatestBlockTimestamp();
    expect(blockTimestamp).to.be.null;
  });

  it("Should check if indexer is up to date #1", async () => {
    const blokcTimestamp = await indexedQueryManager.isIndexerUpToDate();
    expect(blokcTimestamp).to.be.eq(false);
  });

  it("Should getLatestBlockTimestamp", async () => {
    const state = new DBState();
    state.name = "BTC_T";
    state.valueNumber = 13;
    state.timestamp = 25;
    await dataService.manager.save(state);

    const blokcTimestamp = await indexedQueryManager.getLatestBlockTimestamp();
    expect(blokcTimestamp.timestamp).to.be.eq(25);
  });

  it("Should check if indexer is up to date #2", async () => {
    const blokcTimestamp = await indexedQueryManager.isIndexerUpToDate();
    expect(blokcTimestamp).to.be.eq(false);
  });

  it("Should check if indexer is up to date #3", async () => {
    const fakeTime = sinon.useFakeTimers(5000);
    const blokcTimestamp = await indexedQueryManager.isIndexerUpToDate();
    fakeTime.restore();
    expect(blokcTimestamp).to.be.eq(true);
    sinon.restore();
  });

  describe("block query", function () {
    it("Should query block by hash", async () => {
      const params: BlockQueryParams = {
        hash: resBTCBlock.hash,
        roundId: 10,
      };

      const block = new UtxoBlock(resBTCBlock);
      const augBlock = augmentBlock(DBBlockBTC, block);
      await dataService.manager.save(augBlock);

      const blockQueried = await indexedQueryManager.queryBlock(params);
      expect(blockQueried.result.blockNumber).to.be.eq(729410);
    });

    it("Should query block by id", async () => {
      const params: BlockQueryParams = {
        blockNumber: resBTCBlock.height,
        roundId: 10,
        confirmed: true,
      };

      // const block = new UtxoBlock(resBTCBlock);
      // const augBlock = augmentBlock(DBBlockBTC, block);
      // await dataService.manager.save(augBlock);

      const blockQueried = await indexedQueryManager.queryBlock(params);
      expect(blockQueried.result.blockHash).to.be.eq(resBTCBlock.hash);
    });

    it("Should getBlockByHash", async () => {
      const blockQueried = await indexedQueryManager.getBlockByHash(resBTCBlock.hash);
      expect(blockQueried.blockNumber).to.be.eq(resBTCBlock.height);
    });
    it("Should not getBlockByHash", async () => {
      const blockQueried = await indexedQueryManager.getBlockByHash("");
      expect(blockQueried).to.be.null;
    });

    it("Should setDebugLastConfirmedBlock", async () => {
      await indexedQueryManager.setDebugLastConfirmedBlock(15);
      expect(indexedQueryManager.debugLastConfirmedBlock).to.be.equal(15);
      expect(await indexedQueryManager.getLastConfirmedBlockNumber()).to.be.eq(15);
      expect((await indexedQueryManager.getLatestBlockTimestamp()).height).to.be.eq(20);
    });

    it("Should setDebugLastConfirmedBlock for negatives", async () => {
      await indexedQueryManager.setDebugLastConfirmedBlock(-2);
      expect(indexedQueryManager.debugLastConfirmedBlock).to.be.eq(14);
    });

    it("Should un setDebugLastConfirmedBlock", async () => {
      await indexedQueryManager.setDebugLastConfirmedBlock(null);
      expect(indexedQueryManager.debugLastConfirmedBlock).to.be.eq(undefined);
    });

    it("Should getFirstConfirmedBlockAfterTime", async () => {
      const firstBlock = await indexedQueryManager.getFirstConfirmedBlockAfterTime(0);
      expect(firstBlock.blockNumber).to.be.eq(729410);
    });

    it("Should not getFirstConfirmedBlockAfterTime", async () => {
      const firstBlock = await indexedQueryManager.getFirstConfirmedBlockAfterTime(1648480396);
      expect(firstBlock).to.be.null;
    });

    it("Should confirm hasIndexerConfirmedBlockStrictlyBeforeTime", async () => {
      const firstBlock = await indexedQueryManager.hasIndexerConfirmedBlockStrictlyBeforeTime(1648480396);
      expect(firstBlock).to.be.true;
    });

    it("Should not confirm hasIndexerConfirmedBlockStrictlyBeforeTime", async () => {
      const firstBlock = await indexedQueryManager.hasIndexerConfirmedBlockStrictlyBeforeTime(5);
      expect(firstBlock).to.be.false;
    });

    it("Should get getFirstConfirmedOverflowBlock", async function () {
      let check = await indexedQueryManager.getFirstConfirmedOverflowBlock(5, 5);
      expect(check.blockNumber).to.be.eq(729410);
    });

    it("Should not get getFirstConfirmedOverflowBlock", async function () {
      let check = await indexedQueryManager.getFirstConfirmedOverflowBlock(5, 729412);
      expect(check).to.be.eq(null);
    });

    it("Should validateForCutoffTime #1", async function () {
      const block = new UtxoBlock(resBTCBlock);
      const augBlock = augmentBlock(DBBlockBTC, block);
      let validation = await indexedQueryManager.validateForCutoffTime(augBlock, 15);
      expect(validation).to.be.true;
    });

    it("Should validateForCutoffTime #2", async function () {
      const block = new UtxoBlock(resBTCBlock);
      const augBlock = augmentBlock(DBBlockBTC, block);
      let validation = await indexedQueryManager.validateForCutoffTime(augBlock, 1648480395 / 5 + 10);
      expect(validation).to.be.true;
    });
  });

  describe("Query transactions", function () {
    before(async function () {
      await dataService.manager.save(augTx0);
      await dataService.manager.save(augTxAlt1);
    });

    it("should query transaction", async function () {
      let transactionQueryParams: TransactionQueryParams = {
        roundId: 5,
        endBlock: 763380,
      };

      let res = await indexedQueryManager.queryTransactions(transactionQueryParams);
      expect(res.result.length).to.be.eq(2);
    });

    it("should query transaction with txId", async function () {
      let transactionQueryParams: TransactionQueryParams = {
        roundId: 5,
        endBlock: 763380,

        transactionId: "b39d8e733bf9f874c7c82019d41b6df1c829f3988694adf5ebdadb1590832225",
      };

      let res = await indexedQueryManager.queryTransactions(transactionQueryParams);
      expect(res.result.length).to.be.eq(1);
    });

    it("query should not return anything", async function () {
      let transactionQueryParams: TransactionQueryParams = {
        roundId: 5,
        endBlock: 763380,
        paymentReference: "b39d8e733bf9f874c7c82019d41b6df1c829f3988694adf5ebdadb1590832225",
      };

      let res = await indexedQueryManager.queryTransactions(transactionQueryParams);
      expect(res.result.length).to.be.eq(0);
    });
  });
});
