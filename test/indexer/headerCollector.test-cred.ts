// // yarn test test/indexer/blockHeaderCollector.test.ts

import { BtcBlockHeader, ChainType, MCC, UtxoMccCreate } from "@flarenetwork/mcc";
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from "sinon";
import { DBBlockBTC } from "../../src/entity/indexer/dbBlock";
import { HeaderCollector } from "../../src/indexer/headerCollector";
import { IndexerToClient } from "../../src/indexer/indexerToClient";
import { IndexerToDB } from "../../src/indexer/indexerToDB";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { setRetryFailureCallback } from "../../src/utils/helpers/promiseTimeout";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import * as BTCBlockHeader from "../mockData/BTCBlockHeader.json";
import * as BTCBlockHeaderAlt from "../mockData/BTCBlockHeaderAlt.json";
import { getTestFile } from "../test-utils/test-utils";

chai.use(chaiAsPromised);

describe(`Header Collector credentials (${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();

  const databaseConnectOptions = new DatabaseConnectOptions();
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);

  before(async function () {
    if (!dataService.dataSource.isInitialized) {
      await dataService.connect();
    }
  });

  describe(`BTC`, () => {
    const BtcMccConnection = {
      url: "https://bitcoin-api.flare.network",
      username: "public",
      password: "",
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
});
