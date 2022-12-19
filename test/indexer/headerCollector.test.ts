// // yarn test test/indexer/blockHeaderCollector.test.ts

import { ChainType, MCC, XrpMccCreate } from "@flarenetwork/mcc";
import { DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { HeaderCollector } from "../../lib/indexer/headerCollector";
import { IndexerToClient } from "../../lib/indexer/indexerToClient";
import { IndexerToDB } from "../../lib/indexer/indexerToDB";
import { DatabaseService, DatabaseConnectOptions } from "../../lib/utils/databaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { setRetryFailureCallback } from "../../lib/utils/PromiseTimeout";

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

    // Should be fixed (too long trace)
    it.skip("Should not readAndSaveBlocksHeaders", async function () {
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
      headerCollector
        .runBlockHeaderCollecting()
        .then(() => {})
        .catch((e) => getGlobalLogger().error("runBlockHeaderCollecting failed"));
      setTimeout(() => {
        expect(spy.called).to.be.true;
        done();
      }, 1000);
    });
  });
});
