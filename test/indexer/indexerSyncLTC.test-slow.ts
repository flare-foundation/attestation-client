// yarn test test/indexer/indexerSyncLTC.test-slow.ts

import { UtxoBlockTip, UtxoMccCreate } from "@flarenetwork/mcc";
import { DBBlockLTC } from "../../lib/entity/indexer/dbBlock";
import { DBState } from "../../lib/entity/indexer/dbState";
import { DBTransactionLTC0 } from "../../lib/entity/indexer/dbTransaction";
import { Indexer } from "../../lib/indexer/indexer";
import { IndexerConfiguration, IndexerCredentials } from "../../lib/indexer/IndexerConfiguration";
import { ChainConfiguration, ChainsConfiguration } from "../../lib/source/ChainConfiguration";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { BlockHeaderLTC, BlockLTC420, BlockLTC421 } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";

const readTx = require("../../lib/indexer/chain-collector-helpers/readTransaction");
const sinon = require("sinon");
const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;

describe(`Indexer sync LTC ${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();

  describe("construction", function () {
    const LTCMccConnection = new UtxoMccCreate();
    LTCMccConnection.url = "https://litecoin-api.flare.network";
    LTCMccConnection.username = "public";
    LTCMccConnection.password = "";

    const config = new IndexerConfiguration();
    const credentials = new IndexerCredentials();
    const chainConfig = new ChainConfiguration();
    chainConfig.name = "LTC";
    chainConfig.mccCreate = LTCMccConnection;
    chainConfig.blockCollecting = "tips";
    const chainsConfig = new ChainsConfiguration();
    chainsConfig.chains.push(chainConfig);

    const indexer = new Indexer(config, chainsConfig, credentials, "LTC", true);

    before(async function () {
      await indexer.dbService.connect();
      await indexer.interlace.initialize(
        indexer.logger,
        indexer.dbService,
        indexer.chainType,
        indexer.chainConfig.minimalStorageHistoryDays,
        indexer.chainConfig.minimalStorageHistoryBlocks
      );
      indexer.dbBlockClass = indexer.interlace.DBBlockClass;
      indexer.dbTransactionClasses = indexer.interlace.DBTransactionClasses;
    });

    afterEach(function () {
      sinon.restore();
    });

    it("Should construct indexer", function () {
      expect(!indexer).to.be.false;
      expect(!indexer.indexerSync).to.be.false;
    });

    it("Should not run indexer sync when up to date", async function () {
      indexer.chainConfig.blockCollecting = "latestBlock";

      const stub1 = sinon.stub(indexer.indexerToClient, "getBlockHeightFromClient").resolves(10 + indexer.chainConfig.numberOfConfirmations);
      await indexer.indexerSync.runSync(10);
      expect(indexer.N, "N").to.eq(16);
      expect(indexer.T, "T").to.eq(16);
      const state = await indexer.dbService.manager.findOne(DBState, { where: { valueString: "sync" } });

      expect(state.valueNumber).to.eq(-1);
    });

    it("Should run indexer sync", async function () {
      indexer.chainConfig.blockCollecting = "tips";
      indexer.chainConfig.syncReadAhead = 4;

      const stub1 = sinon.stub(indexer.indexerToClient, "getBlockHeightFromClient").resolves(2402421 + indexer.chainConfig.numberOfConfirmations);
      const stub2 = sinon.stub(indexer.indexerSync, "getSyncStartBlockNumber").resolves(2402419);

      const stub3 = sinon.stub(indexer.indexerToClient.client, "getBlock");
      stub3.withArgs(2402420).resolves(BlockLTC420);
      stub3.withArgs(2402421).resolves(BlockLTC421);

      const stub4 = sinon.stub(readTx, "getFullTransactionUtxo").callsFake(async (x, y, z) => y);

      const tip = new UtxoBlockTip({
        hash: "682a97ab2b41ccd025df47f5fac5b902f04776031fb4961373230c9ef6e1f585",
        height: 2402422,
        branchlen: 1,
        status: "headers-only",
      });

      const stub5 = sinon.stub(indexer.cachedClient.client, "getTopLiteBlocks").resolves([tip]);

      await indexer.indexerSync.runSync(0);

      const res1 = await indexer.dbService.manager.findOne(DBBlockLTC, { where: { blockNumber: 2402420 } });
      const res2 = await indexer.dbService.manager.findOne(DBTransactionLTC0, {
        where: { transactionId: "42beef0068756c78cade98443dfa9db875d84dba363977d61df2091088efa10f" },
      });
      const res3 = await indexer.dbService.manager.findOne(DBState, {
        where: { comment: "collecting tips" },
      });

      expect(res1.blockNumber).to.eq(2402420);
      expect(res2.blockNumber).to.eq(2402420);
      expect(res3.valueString).to.eq("waiting");
    });

    it("Should run headerCollector", function (done) {
      const tip1 = new UtxoBlockTip({
        hash: "682a97ab2b41ccd025df47f5fac5b902f04776031fb4961373230c9ef6e1f585",
        height: 2402422,
        branchlen: 1,
        status: "headers-only",
      });

      const tip2 = new UtxoBlockTip({
        hash: "682a97ab2b41ccd025df47f5fac5b902f04776031fb4961373230c9ef6e1f584",
        height: 2402423,
        branchlen: 2,
        status: "headers-only",
      });

      const tip3 = new UtxoBlockTip({
        hash: "8d1ba90d4443b7750c769861e2ed2a58480aec3ad1ea712e203af70525fa3d68",
        height: 2402424,
        branchlen: 0,
        status: "active",
      });

      const stub1 = sinon.stub(indexer.indexerToClient, "getBlockHeightFromClient").resolves(2402421 + indexer.chainConfig.numberOfConfirmations);
      const stub2 = sinon.stub(indexer.cachedClient.client, "getTopLiteBlocks").resolves([tip1, tip2, tip3]);
      const stub3 = sinon
        .stub(indexer.indexerToClient, "getBlockHeaderFromClientByHash")
        .withArgs("saveHeadersOnNewTips", "8d1ba90d4443b7750c769861e2ed2a58480aec3ad1ea712e203af70525fa3d68")
        .resolves(BlockHeaderLTC);

      const spy = sinon.spy(indexer.headerCollector.indexerToDB, "writeT");
      indexer.headerCollector
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
