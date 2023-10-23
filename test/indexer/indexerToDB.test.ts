// yarn test test/indexer/indexerToDB.test.ts

import { ChainType } from "@flarenetwork/mcc";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { afterEach } from "mocha";
import sinon from "sinon";
import { DBBlockBTC } from "../../src/entity/indexer/dbBlock";
import { DBState } from "../../src/entity/indexer/dbState";
import { DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1 } from "../../src/entity/indexer/dbTransaction";
import { getStateEntry } from "../../src/indexer/indexer-utils";
import { IndexerToDB } from "../../src/indexer/indexerToDB";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import * as loggers from "../../src/utils/logging/logger";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { AugTestBlockBTC, promAugTxBTC0, promAugTxBTC1, promAugTxBTCAlt0, promAugTxBTCAlt1 } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";

chai.use(chaiAsPromised);

describe(`IndexerToDB (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();
  const databaseConnectOptions = new DatabaseConnectOptions();
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);

  let augTx0: DBTransactionBase;
  let augTxAlt0: DBTransactionBase;
  let augTx1: DBTransactionBase;
  let augTxAlt1: DBTransactionBase;

  const indexerToDB = new IndexerToDB(getGlobalLogger(), dataService, ChainType.BTC);

  before(async () => {
    augTx0 = await promAugTxBTC0;
    augTxAlt0 = await promAugTxBTCAlt0;
    augTx1 = await promAugTxBTC1;
    augTxAlt1 = await promAugTxBTCAlt1;

    if (!dataService.dataSource.isInitialized) {
      await dataService.connect();
    }

    //start with empty tables
    for (let i = 0; i < 2; i++) {
      const tableName = `btc_transactions${i}`;
      await dataService.manager.query(`delete from ${tableName};`);
    }
    await dataService.manager.query(`delete from btc_block;`);
    const tableName = "state";
    await dataService.manager.query(`delete from ${tableName};`);
  });

  afterEach(function () {
    sinon.restore();
  });

  it("Should get the number of the last processed and saved block number from empty DB", async function () {
    let res = await indexerToDB.getNfromDB();
    expect(res).to.be.eq(0);
  });

  it("Should get last processed and saved block number from DB", async function () {
    const state = getStateEntry("N", ChainType[ChainType.BTC], 10);
    await dataService.manager.save(state);

    let res = await indexerToDB.getNfromDB();
    expect(res).to.be.eq(10);
  });

  it("Should not getBottomDBBlockNumberFromStoredTransactions from empty database", async function () {
    let res = await indexerToDB.getBottomDBBlockNumberFromStoredTransactions();
    expect(res).to.be.undefined;
  });

  it("Should getBottomDBBlockNumberFromStoredTransactions from non empty database #1", async function () {
    await dataService.manager.save(augTx0);
    await dataService.manager.save(augTxAlt0);
    let res = await indexerToDB.getBottomDBBlockNumberFromStoredTransactions();
    expect(res).to.be.eq(729410);
  });

  it("Should getBottomDBBlockNumberFromStoredTransactions from non empty database #2", async function () {
    await dataService.manager.query(`delete from btc_transactions0;`);

    for (let j = 0; j < 10; j++) {
      let fakeTx = new DBTransactionBTC1();
      fakeTx.transactionId = `a4ba${j}`;
      fakeTx.timestamp = j + 1000;
      fakeTx.blockNumber = 10000 + j;
      await dataService.manager.save(fakeTx);
    }

    let res = await indexerToDB.getBottomDBBlockNumberFromStoredTransactions();
    expect(res).to.be.eq(10000);
  });

  it("Should getBottomDBBlockNumberFromStoredTransactions from non empty databases #3", async function () {
    const tableName = `btc_transactions1`;
    await dataService.manager.query(`delete from ${tableName};`);

    await dataService.manager.save(augTx1);
    await dataService.manager.save(augTxAlt0);
    let res = await indexerToDB.getBottomDBBlockNumberFromStoredTransactions();
    expect(res).to.be.eq(729410);
  });

  it("Should getBottomDBBlockNumberFromStoredTransactions from non empty databases #4", async function () {
    for (let i = 0; i < 2; i++) {
      const tableName = `btc_transactions${i}`;
      await dataService.manager.query(`delete from ${tableName};`);
    }

    await dataService.manager.save(augTx0);
    await dataService.manager.save(augTxAlt1);
    let res = await indexerToDB.getBottomDBBlockNumberFromStoredTransactions();
    expect(res).to.be.eq(729410);
  });

  it("Should not saveBottomState with no transaction in DB", async function () {
    for (let i = 0; i < 2; i++) {
      const tableName = `btc_transactions${i}`;
      await dataService.manager.query(`delete from ${tableName};`);
    }

    const spy = sinon.spy(indexerToDB.logger, "debug");

    await indexerToDB.saveBottomState();
    expect(spy.called).to.be.true;
  });

  it("Should not saveBottomState with no block in DB", async function () {
    await dataService.manager.save(augTx0);
    await dataService.manager.save(augTxAlt1);
    const tableName = "btc_block";
    await dataService.manager.query(`delete from ${tableName};`);

    const spy = sinon.spy(loggers, "logException");

    await indexerToDB.saveBottomState();

    expect(spy.called).to.be.true;
  });

  it("Should saveBottomState DB", async function () {
    await dataService.manager.save(AugTestBlockBTC);

    await indexerToDB.saveBottomState();

    const res1 = await dataService.manager.findOne(DBState, { where: { name: "btc_Nbottom" } });
    expect(res1.valueNumber).to.eq(729410);
  });

  it("Should drop all state info", async function () {
    await indexerToDB.dropAllStateInfo();
    const res2 = await dataService.manager.find(DBState);

    expect(res2.length).to.be.eq(0);
  });

  it("Should not drop non existing table", async function () {
    const spy2 = sinon.spy(indexerToDB.logger, "error");
    await indexerToDB.dropTable("MissingTable");
    expect(spy2.callCount).to.eq(1);
  });

  it("Should drop a table", async function () {
    await dataService.manager.save(augTx0);
    await indexerToDB.dropTable("btc_transactions0");
    const res = await dataService.manager.find(DBTransactionBTC0);
    expect(res.length).to.be.eq(0);
  });

  it("Should drop all dropAllChainTables", async function () {
    await dataService.manager.save(augTx0);
    await dataService.manager.save(augTxAlt1);
    await dataService.manager.save(AugTestBlockBTC);

    await indexerToDB.dropAllChainTables("btc");

    const res1 = await dataService.manager.find(DBTransactionBTC0);
    const res2 = await dataService.manager.find(DBTransactionBTC1);
    const res3 = await dataService.manager.find(DBBlockBTC);
    expect(res1.length).to.be.eq(0);
    expect(res2.length).to.be.eq(0);
    expect(res3.length).to.be.eq(0);
  });

  it("Should writeT", async function () {
    await indexerToDB.writeT(118);
    const res = await dataService.manager.findOne(DBState, { where: { name: "btc_T" } });
    expect(res.valueNumber).to.eq(118);
  });
});
