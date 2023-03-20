// yarn test test/indexer/indexerSync.test-slow.ts

import { XrpMccCreate } from "@flarenetwork/mcc";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import sinon from "sinon";
import { ChainConfig } from "../../src/attester/configs/ChainConfig";
import { DBBlockXRP } from "../../src/entity/indexer/dbBlock";
import { DBState } from "../../src/entity/indexer/dbState";
import { Indexer } from "../../src/indexer/indexer";
import { IndexerConfig } from "../../src/indexer/IndexerConfig";
import { initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { BlockXRP612, BlockXRP613, BlockXRP614 } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";
chai.use(chaiAsPromised);

describe(`Indexer sync XRP ${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();

  describe("construction", function () {
    const XRPMccConnection = new XrpMccCreate();
    XRPMccConnection.url = "https://xrplcluster.com";

    const config = new IndexerConfig();
    const chainConfig = new ChainConfig();
    chainConfig.name = "XRP";
    chainConfig.mccCreate = XRPMccConnection;

    config.chainConfiguration = chainConfig;

    const indexer = new Indexer(config, "XRP", true);

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

    it("Should run indexer sync up to date", async function () {
      indexer.chainConfig.blockCollecting = "latestBlock";

      const stub1 = sinon.stub(indexer.indexerToClient, "getBlockHeightFromClient").resolves(10 + indexer.chainConfig.numberOfConfirmations);
      await indexer.indexerSync.runSync(10);
      expect(indexer.N, "N").to.eq(16);
      expect(indexer.T, "T").to.eq(16);
      const state = await indexer.dbService.manager.findOne(DBState, { where: { valueString: "sync" } });

      expect(state.valueNumber).to.eq(-1);
    });

    it("Should run indexer sync up", async function () {
      sinon.stub(console, "error");
      sinon.stub(console, "log");

      indexer.chainConfig.blockCollecting = "raw";
      indexer.chainConfig.syncReadAhead = 4;

      const stub1 = sinon.stub(indexer.indexerToClient, "getBlockHeightFromClient").resolves(28014614 + indexer.chainConfig.numberOfConfirmations);
      const stub2 = sinon.stub(indexer.indexerSync, "getSyncStartBlockNumber").resolves(28014611);

      const stub3 = sinon.stub(indexer.indexerToClient.client, "getBlock");
      stub3.withArgs(28014612).resolves(BlockXRP612);
      stub3.withArgs(28014613).resolves(BlockXRP613);
      stub3.withArgs(28014614).resolves(BlockXRP614);

      await indexer.indexerSync.runSync(0);

      const res = await indexer.dbService.manager.findOne(DBBlockXRP, { where: { blockNumber: 28014613 } });
      expect(res.blockHash).to.eq("2919A310215E94E882ADF3FDFDAFCA33D67D82753F96F42BA35AE80799770A59");
    });
  });
});
