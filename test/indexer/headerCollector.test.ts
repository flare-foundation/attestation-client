// yarn test test/indexer/headerCollector.test.ts

import { ChainType, MCC, XrpMccCreate, sleepMs } from "@flarenetwork/mcc";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { DBBlockXRP } from "../../src/entity/indexer/dbBlock";
import { HeaderCollector } from "../../src/indexer/headerCollector";
import { IndexerToClient } from "../../src/indexer/indexerToClient";
import { IndexerToDB } from "../../src/indexer/indexerToDB";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { setRetryFailureCallback } from "../../src/utils/helpers/promiseTimeout";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { TestBlockXRP } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";

chai.use(chaiAsPromised);

describe(`Header Collector (${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();

  const databaseConnectOptions = new DatabaseConnectOptions();
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);

  before(async function () {
    if (!dataService.dataSource.isInitialized) {
      await dataService.connect();
    }
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
      headerCollector.updateIndexedHeight(765468);
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

    it("Should not work with empty list saveHeadersOnNewTips ", async function () {
      await headerCollector.saveHeadersOnNewTips([]);
      let res = await dataService.manager.find(DBBlockXRP);
      expect(res.length).to.eq(1);
    });

    it("Should readAndSaveBlocksHeaders", async function () {
      headerCollector.updateIndexedHeight(76_468_241);

      await headerCollector.readAndSaveBlocksHeaders(76_468_242, 76_468_244);
      let res = await dataService.manager.findOne(DBBlockXRP, { where: { blockNumber: 76_468_243 } });
      expect(res.blockHash).eq("D97DBEB5E42F95AB5CF4215A35A8C3E93677730254F0966F3B4F3FDB087584C5");
    });

    // Should be fixed (too long trace)
    it("Should not readAndSaveBlocksHeaders", async function () {
      headerCollector.updateIndexedHeight(10);
      const fake = sinon.fake();
      setRetryFailureCallback((string) => {
        fake();
      });
      await expect(headerCollector.readAndSaveBlocksHeaders(9, 12));
      setRetryFailureCallback(undefined);
      expect(fake.callCount).to.eq(1);
    });

    it("Should runBlockHeaderCollectingRaw", function (done) {
      const spy = sinon.spy(headerCollector.indexerToDB, "writeTipHeight");
      headerCollector
        .runBlockHeaderCollecting()
        .then(() => {})
        .catch((e) => getGlobalLogger().error("runBlockHeaderCollecting failed"));
      setTimeout(() => {
        expect(spy.called).to.be.true;
        done();
      }, 1000);
    });

    it("Should clear cache", async function () {
      let cacheSizeBefore1 = headerCollector["blockNumberHash"].size;
      let cacheSizeBefore2 = headerCollector["blockHeaderNumber"].size;
      let cacheSizeBefore3 = headerCollector["blockHeaderHash"].size;

      expect(cacheSizeBefore1).to.eq(4);
      expect(cacheSizeBefore2).to.eq(4);
      expect(cacheSizeBefore3).to.eq(4);

      headerCollector.onUpdateBottomBlockNumber(76468243);
      await sleepMs(10);

      cacheSizeBefore1 = headerCollector["blockNumberHash"].size;
      cacheSizeBefore2 = headerCollector["blockHeaderNumber"].size;
      cacheSizeBefore3 = headerCollector["blockHeaderHash"].size;

      expect(cacheSizeBefore1, "NH").to.eq(3);
      expect(cacheSizeBefore2, "HN").to.eq(3);
      expect(cacheSizeBefore3, "HH").to.eq(3);
    });
  });
});
