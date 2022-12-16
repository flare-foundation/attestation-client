// // yarn test test/indexer/blockHeaderCollector.test.ts

import { BtcBlockHeader, ChainType, MCC, UtxoMccCreate, XrpMccCreate } from "@flarenetwork/mcc";
import { DBBlockBTC, DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { HeaderCollector } from "../../lib/indexer/headerCollector";
import { IndexerToClient } from "../../lib/indexer/indexerToClient";
import { IndexerToDB } from "../../lib/indexer/indexerToDB";
import { DatabaseService, DatabaseConnectOptions } from "../../lib/utils/databaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { setRetryFailureCallback } from "../../lib/utils/PromiseTimeout";
import * as BTCBlockHeader from "../mockData/BTCBlockHeader.json";
import * as BTCBlockHeaderAlt from "../mockData/BTCBlockHeaderAlt.json";
import { TestBlockXRP } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";

const sinon = require("sinon");
const chai = require("chai");
const expect = chai.expect;
// const fs = require("fs");
chai.use(require("chai-as-promised"));

describe(`Header Collector (${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();

  const databaseConnectOptions = new DatabaseConnectOptions();
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);

  before(async function () {
    if (!dataService.dataSource.isInitialized) {
      await dataService.connect();
    }
  });

  describe.skip(`BTC`, () => {
    const BtcMccConnection = {
      url: process.env.BTC_URL || "",
      username: process.env.BTC_USERNAME || "",
      password: process.env.BTC_PASSWORD || "",
    } as UtxoMccCreate;

    const client = new MCC.BTC(BtcMccConnection);
    const indexerToClient = new IndexerToClient(client);

    //   let interlacing = new Interlacing();

    const indexerToDB = new IndexerToDB(getGlobalLogger(), dataService, ChainType.BTC);

    const settings = {
      blockCollectTimeMs: 10,
      numberOfConfirmations: 7,
      blockCollecting: "raw" as "raw",
    };

    const headerCollector = new HeaderCollector(getGlobalLogger(), 10, indexerToClient, indexerToDB, settings);

    before(async function () {
      const tableName = "btc_block";
      await dataService.manager.query(`delete from ${tableName};`);
    });

    afterEach(function () {
      sinon.restore();
    });

    it("Should update N", async function () {
      headerCollector.updateN(765468);
    });

    it("Should saveHeadersOnNewTips ", async function () {
      const header = new BtcBlockHeader(BTCBlockHeader);
      const headerAlt = new BtcBlockHeader(BTCBlockHeaderAlt);

      await headerCollector.saveHeadersOnNewTips([header, headerAlt]);
      let res = await dataService.manager.find(DBBlockBTC);
      expect(res.length).to.eq(1);
    });

    it("Should cache when saveHeadersOnNewTips", async function () {
      const header = new BtcBlockHeader(BTCBlockHeader);

      await headerCollector.saveHeadersOnNewTips([header, header]);
      let res = await dataService.manager.find(DBBlockBTC);
      expect(res.length).to.be.eq(1);
    });

    it("Should not work with empty list saveHeadersOnNewTips ", async function () {
      await headerCollector.saveHeadersOnNewTips([]);
      let res = await dataService.manager.find(DBBlockBTC);
      expect(res.length).to.eq(1);
    });

    it("Should saveHeadersOnNewTips", async function () {
      headerCollector.updateN(10);

      const tips = await client.getBlockTips(10);

      await headerCollector.saveHeadersOnNewTips(tips);
      let res = await dataService.manager.find(DBBlockBTC);
      expect(res.length).to.be.above(1);
    });

    it("Should readAndSaveBlocksHeaders", async function () {
      headerCollector.updateN(10);

      await headerCollector.readAndSaveBlocksHeaders(11, 12);
      let res = await dataService.manager.findOne(DBBlockBTC, { where: { blockNumber: 12 } });
      expect(res.blockHash).eq("0000000027c2488e2510d1acf4369787784fa20ee084c258b58d9fbd43802b5e");
    });

    it("Should not readAndSaveBlocksHeaders", async function () {
      headerCollector.updateN(10);
      let j = "not jet failed";
      const fake = sinon.fake();
      setRetryFailureCallback((string) => {
        fake();
      });
      await expect(headerCollector.readAndSaveBlocksHeaders(9, 12));
      setRetryFailureCallback(undefined);
      expect(fake.callCount).to.eq(1);
      sinon.restore();
    });

    it("Should runBlockHeaderCollectingRaw", function (done) {
      const spy = sinon.spy(headerCollector.indexerToDB, "writeT");
      setTimeout(done, 6000);
      headerCollector
        .runBlockHeaderCollecting()
        .then(() => {})
        .catch((e) => getGlobalLogger().error("runBlockHeaderCollecting failed"));
      setTimeout(() => {
        expect(spy.called).to.be.true, sinon.restore();
      }, 2000);
    });

    it("Should runBlockHeaderCollectingTips", function (done) {
      const spy1 = sinon.spy(headerCollector.indexerToDB, "writeT");
      const spy2 = sinon.spy(headerCollector, "saveHeadersOnNewTips");
      setTimeout(done, 6000);
      headerCollector
        .runBlockHeaderCollectingTips()
        .then(() => {})
        .catch((e) => getGlobalLogger().error("runBlockHeaderCollectingTips failed"));
      setTimeout(() => {
        expect(spy1.called).to.be.true;
        expect(!spy2.called).to.be.false;
        sinon.restore();
      }, 5000);
    });
  });

  describe("XRP", function () {
    const XRPMccConnection = {
      url: "https://xrplcluster.com",
      username: "",
      password: "",
    } as XrpMccCreate;

    const client = new MCC.XRP(XRPMccConnection);
    let indexerToClient = new IndexerToClient(client, 1500, 2, 300);

    const indexerToDB = new IndexerToDB(getGlobalLogger(), dataService, ChainType.XRP);

    const settings = {
      blockCollectTimeMs: 10,
      numberOfConfirmations: 7,
      blockCollecting: "raw" as "raw",
    };

    const headerCollector = new HeaderCollector(getGlobalLogger(), 10, indexerToClient, indexerToDB, settings);

    before(async function () {
      const tableName = "xrp_block";
      await dataService.manager.query(`delete from ${tableName};`);
    });

    afterEach(function () {
      sinon.restore();
    });

    it("Should update N", async function () {
      headerCollector.updateN(765468);
    });

    it("Should saveHeadersOnNewTips ", async function () {
      const header = TestBlockXRP;

      await headerCollector.saveHeadersOnNewTips([header]);
      let res = await dataService.manager.find(DBBlockXRP);
      expect(res.length).to.eq(1);
    });

    it("Should cache when saveHeadersOnNewTips", async function () {
      const header = TestBlockXRP;

      await headerCollector.saveHeadersOnNewTips([header, header]);
      let res = await dataService.manager.find(DBBlockXRP);
      expect(res.length).to.be.eq(1);
    });

    //Needs improvement
    it("Should not work with empty list saveHeadersOnNewTips ", async function () {
      await headerCollector.saveHeadersOnNewTips([]);
      let res = await dataService.manager.find(DBBlockXRP);
      expect(res.length).to.eq(1);
    });

    it("Should readAndSaveBlocksHeaders", async function () {
      headerCollector.updateN(76_468_241);

      await headerCollector.readAndSaveBlocksHeaders(76_468_242, 76_468_244);
      let res = await dataService.manager.findOne(DBBlockXRP, { where: { blockNumber: 76_468_243 } });
      expect(res.blockHash).eq("D97DBEB5E42F95AB5CF4215A35A8C3E93677730254F0966F3B4F3FDB087584C5");
    });

    it("Should not readAndSaveBlocksHeaders", async function () {
      headerCollector.updateN(10);
      let j = "not jet failed";
      const fake = sinon.fake();
      setRetryFailureCallback((string) => {
        fake();
      });
      await expect(headerCollector.readAndSaveBlocksHeaders(9, 12));
      setRetryFailureCallback(undefined);
      expect(fake.callCount).to.eq(1);
    });

    it("Should runBlockHeaderCollectingRaw", function (done) {
      const spy = sinon.spy(headerCollector.indexerToDB, "writeT");
      setTimeout(done, 3000);
      headerCollector
        .runBlockHeaderCollecting()
        .then(() => {})
        .catch((e) => getGlobalLogger().error("runBlockHeaderCollecting failed"));
      setTimeout(() => {
        expect(spy.called).to.be.true;
      }, 2000);
    });

    it("Should runBlockHeaderCollectingTips", function (done) {
      const spy1 = sinon.spy(headerCollector.indexerToDB, "writeT");
      const spy2 = sinon.spy(headerCollector, "saveHeadersOnNewTips");
      setTimeout(done, 5000);
      headerCollector
        .runBlockHeaderCollectingTips()
        .then(() => {})
        .catch((e) => getGlobalLogger().error("runBlockHeaderCollectingTips failed"));
      setTimeout(() => {
        expect(spy1.called).to.be.true;
        expect(spy2.called).to.be.false;
      }, 4900);
    });
  });
});
