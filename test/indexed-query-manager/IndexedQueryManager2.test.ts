import { BtcBlock, ChainType } from "@flarenetwork/mcc";
import { expect } from "chai";
import { DBBlockBTC } from "../../src/entity/indexer/dbBlock";
import { DBState } from "../../src/entity/indexer/dbState";
import { DBTransactionBase } from "../../src/entity/indexer/dbTransaction";
import { IndexedQueryManager } from "../../src/indexed-query-manager/IndexedQueryManager";
import { BlockQueryParams, IndexedQueryManagerOptions, TransactionQueryParams } from "../../src/indexed-query-manager/indexed-query-manager-types";
import { augmentBlock } from "../../src/indexer/chain-collector-helpers/augmentBlock";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import { promAugTxBTC0, promAugTxBTC1, promAugTxBTCAlt0, promAugTxBTCAlt1 } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";

describe(`IndexedQueryManager (${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();
  const databaseConnectOptions = new DatabaseConnectOptions();
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);
  let indexedQueryManager: IndexedQueryManager;

  let augTx0: DBTransactionBase;
  let augTxAlt0: DBTransactionBase;
  let augTx1: DBTransactionBase;
  let augTxAlt1: DBTransactionBase;

  before(async () => {
    await dataService.connect();

    const options: IndexedQueryManagerOptions = {
      entityManager: dataService.manager,
      chainType: ChainType.BTC,
      numberOfConfirmations: () => 5,
    };
    indexedQueryManager = new IndexedQueryManager(options);

    initializeTestGlobalLogger();

    augTx0 = await promAugTxBTC0;
    augTxAlt0 = await promAugTxBTCAlt0;
    augTx1 = await promAugTxBTC1;
    augTxAlt1 = await promAugTxBTCAlt1;

    //start with empty tables
    for (let i = 0; i < 2; i++) {
      const tableName = `btc_transactions${i}`;
      await dataService.manager.query(`delete from ${tableName};`);
    }

    const tableName = "btc_block";
    await dataService.manager.query(`delete from ${tableName};`);
  });

  it("Should get chain N ", () => {
    expect((indexedQueryManager as any).getChainN()).to.be.eq("BTC_N");
  });
  it("Should get chain T ", () => {
    expect((indexedQueryManager as any).getChainT()).to.be.eq("BTC_T");
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

  it("Should getLatestBlockTimestamp", async () => {
    const state = new DBState();
    state.name = "BTC_T";
    state.valueNumber = 13;
    state.timestamp = 25;
    await dataService.manager.save(state);

    const blokcTimestamp = await indexedQueryManager.getLatestBlockTimestamp();
    expect(blokcTimestamp.timestamp).to.be.eq(25);
  });

  describe("block query", function () {
    it("Should query block by hash", async () => {
      const params: BlockQueryParams = {
        hash: resBTCBlock.hash,
      };

      const block = new BtcBlock(resBTCBlock);
      const augBlock = augmentBlock(DBBlockBTC, block);
      await dataService.manager.save(augBlock);

      const blockQueried = await indexedQueryManager.queryBlock(params);
      expect(blockQueried.result.blockNumber).to.be.eq(729410);
    });

    it("Should query block by id", async () => {
      const params: BlockQueryParams = {
        blockNumber: resBTCBlock.height,
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
      expect(blockQueried).to.be.undefined;
    });

    it("Should get getFirstConfirmedOverflowBlock", async function () {
      let check = await (indexedQueryManager as any).getFirstConfirmedOverflowBlock(5, 5);
      expect(check.blockNumber).to.be.eq(729410);
    });

    it("Should not get getFirstConfirmedOverflowBlock", async function () {
      let check = await (indexedQueryManager as any).getFirstConfirmedOverflowBlock(5, 729412);
      expect(check).to.be.eq(null);
    });

    // it("Should validateForCutoffTime #1", async function () {
    //   const block = new UtxoBlock(resBTCBlock);
    //   const augBlock = augmentBlock(DBBlockBTC, block);
    //   let validation = await indexedQueryManager.validateForCutoffTime(augBlock, 15);
    //   expect(validation).to.be.true;
    // });

    // it("Should validateForCutoffTime #2", async function () {
    //   const block = new UtxoBlock(resBTCBlock);
    //   const augBlock = augmentBlock(DBBlockBTC, block);
    //   let validation = await indexedQueryManager.validateForCutoffTime(augBlock, 1648480395 / 5 + 10);
    //   expect(validation).to.be.true;
    // });
  });

  describe("Query transactions", function () {
    before(async function () {
      await dataService.manager.save(augTx0);
      await dataService.manager.save(augTxAlt1);
    });

    it("Should query transaction", async function () {
      let transactionQueryParams: TransactionQueryParams = {
        endBlockNumber: 763380,
      };

      let res = await indexedQueryManager.queryTransactions(transactionQueryParams);
      expect(res.result.length).to.be.eq(2);
    });

    it("Should query transaction with txId", async function () {
      let transactionQueryParams: TransactionQueryParams = {
        endBlockNumber: 763380,

        transactionId: "b39d8e733bf9f874c7c82019d41b6df1c829f3988694adf5ebdadb1590832225",
      };

      let res = await indexedQueryManager.queryTransactions(transactionQueryParams);
      expect(res.result.length).to.be.eq(1);
    });

    it("query should not return anything", async function () {
      let transactionQueryParams: TransactionQueryParams = {
        endBlockNumber: 763380,
        paymentReference: "b39d8e733bf9f874c7c82019d41b6df1c829f3988694adf5ebdadb1590832225",
      };

      let res = await indexedQueryManager.queryTransactions(transactionQueryParams);
      expect(res.result.length).to.be.eq(0);
    });
  });
});
