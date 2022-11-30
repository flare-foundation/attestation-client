import { ChainType } from "@flarenetwork/mcc";
import { afterEach } from "mocha";
import { DBBlockBTC } from "../../lib/entity/indexer/dbBlock";
import { DBState } from "../../lib/entity/indexer/dbState";
import { DBTransactionBase, DBTransactionBTC0, DBTransactionBTC1 } from "../../lib/entity/indexer/dbTransaction";
import { getStateEntry } from "../../lib/indexer/indexer-utils";
import { IndexerToDB } from "../../lib/indexer/indexerToDB";
import { Interlacing } from "../../lib/indexer/interlacing";
import { DatabaseService, DatabaseSourceOptions } from "../../lib/utils/databaseService";
import { getGlobalLogger } from "../../lib/utils/logger";
import { AugTestBlockBTC, promAugTxBTC0, promAugTxBTC1, promAugTxBTCALt0, promAugTxBTCAlt1 } from "../mockData/indexMock";
const loggers = require("../../lib/utils/logger");
const sinon = require("sinon");

const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;
const assert = chai.assert;

describe("IndexerToBD", function () {
  const databaseConnectOptions = new DatabaseSourceOptions();
  databaseConnectOptions.database = process.env.DATABASE_NAME1;
  databaseConnectOptions.username = process.env.DATABASE_USERNAME;
  databaseConnectOptions.password = process.env.DATBASE_PASS;
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions);

  let interlacing = new Interlacing();

  let augTx0: DBTransactionBase;
  let augTxAlt0: DBTransactionBase;
  let augTx1: DBTransactionBase;
  let augTxAlt1: DBTransactionBase;

  const indexerToDB = new IndexerToDB(getGlobalLogger(), interlacing, dataService, ChainType.BTC);

  before(async () => {
    augTx0 = await promAugTxBTC0;
    augTxAlt0 = await promAugTxBTCALt0;
    augTx1 = await promAugTxBTC1;
    augTxAlt1 = await promAugTxBTCAlt1;

    if (!dataService.dataSource.isInitialized) {
      await dataService.init();
    }

    //start with empty tables
    for (let i = 0; i < 2; i++) {
      const tableName = `btc_transactions${i}`;
      await dataService.connection.query(`TRUNCATE ${tableName};`);
    }

    const tableName = "state";
    await dataService.connection.query(`TRUNCATE ${tableName};`);
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

  it("should not getBottomDBBlockNumberFromStoredTransactions from empty database", async function () {
    let res = await indexerToDB.getBottomDBBlockNumberFromStoredTransactions();
    expect(res).to.be.undefined;
  });

  it("should getBottomDBBlockNumberFromStoredTransactions from non empty database #1", async function () {
    await dataService.manager.save(augTx0);
    await dataService.manager.save(augTxAlt0);
    let res = await indexerToDB.getBottomDBBlockNumberFromStoredTransactions();
    expect(res).to.be.eq(729410);
  });

  it("should getBottomDBBlockNumberFromStoredTransactions from non empty database #2", async function () {
    const tableName = `btc_transactions0`;
    await dataService.connection.query(`TRUNCATE ${tableName};`);

    await dataService.manager.save(augTx1);
    await dataService.manager.save(augTxAlt1);
    let res = await indexerToDB.getBottomDBBlockNumberFromStoredTransactions();
    expect(res).to.be.eq(729410);
  });

  it("should getBottomDBBlockNumberFromStoredTransactions from non empty database #3", async function () {
    const tableName = `btc_transactions1`;
    await dataService.connection.query(`TRUNCATE ${tableName};`);

    await dataService.manager.save(augTx1);
    await dataService.manager.save(augTxAlt0);
    let res = await indexerToDB.getBottomDBBlockNumberFromStoredTransactions();
    expect(res).to.be.eq(729410);
  });

  it("should getBottomDBBlockNumberFromStoredTransactions from non empty database #4", async function () {
    for (let i = 0; i < 2; i++) {
      const tableName = `btc_transactions${i}`;
      await dataService.connection.query(`TRUNCATE ${tableName};`);
    }

    await dataService.manager.save(augTx0);
    await dataService.manager.save(augTxAlt1);
    let res = await indexerToDB.getBottomDBBlockNumberFromStoredTransactions();
    expect(res).to.be.eq(729410);
  });

  it("should not saveBottomState with no transaction in DB", async function () {
    for (let i = 0; i < 2; i++) {
      const tableName = `btc_transactions${i}`;
      await dataService.connection.query(`TRUNCATE ${tableName};`);
    }

    const spy = sinon.spy(indexerToDB.logger, "debug");

    await indexerToDB.saveBottomState();
    assert(spy.called);
  });

  it("should not saveBottomState with no transaction in DB", async function () {
    for (let i = 0; i < 2; i++) {
      const tableName = `btc_transactions${i}`;
      await dataService.connection.query(`TRUNCATE ${tableName};`);
    }

    const spy = sinon.spy(indexerToDB.logger, "debug");

    await indexerToDB.saveBottomState();
    assert(spy.called);
  });

  it("should not saveBottomState with no block in DB", async function () {
    await dataService.manager.save(augTx0);
    await dataService.manager.save(augTxAlt1);
    const tableName = "btc_block";
    await dataService.connection.query(`TRUNCATE ${tableName};`);

    const spy = sinon.spy(loggers, "logException");

    await indexerToDB.saveBottomState();

    assert(spy.called);
  });

  //find use cases
  it("should saveBottomState DB", async function () {
    await dataService.manager.save(AugTestBlockBTC);

    await indexerToDB.saveBottomState();

    const res1 = await dataService.manager.findOne(DBState, { where: { name: "btc_Nbottom" } });
    expect(res1.valueNumber).to.eq(729410);
  });

  it("should drop all state info", async function () {
    // const res1 = await dataService.manager.find(DBState);

    await indexerToDB.dropAllStateInfo();
    const res2 = await dataService.manager.find(DBState);

    expect(res2.length).to.be.eq(0);
  });

  it("should not drop non existing table", async function () {
    const spy2 = sinon.spy(loggers, "logException");
    await indexerToDB.dropTable("MissingTable");
    expect(spy2.callCount).to.eq(1);
  });

  it("should drop a table", async function () {
    await dataService.manager.save(augTx0);
    await indexerToDB.dropTable("btc_transactions0");
    const res = await dataService.manager.find(DBTransactionBTC0);
    expect(res.length).to.be.eq(0);
  });

  it("should drop all dropAllChainTables", async function () {
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

  it("should writeT", async function () {
    await indexerToDB.writeT(118);
    const res = await dataService.manager.findOne(DBState, { where: { name: "btc_T" } });
    expect(res.valueNumber).to.eq(118);
  });
});
