// yarn test test/indexer/indexerSync.test.ts

import { ChainType, XrpMccCreate } from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../lib/caching/CachedMccClient";
import { DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { DBState } from "../../lib/entity/indexer/dbState";
import { Indexer } from "../../lib/indexer/indexer";
import { IndexerConfiguration, IndexerCredentials } from "../../lib/indexer/IndexerConfiguration";
import { ChainConfiguration, ChainsConfiguration } from "../../lib/source/ChainConfiguration";
import { initializeTestGlobalLogger } from "../../lib/utils/logger";
import { TestBlockXRPAlt } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";

const sinon = require("sinon");
const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;
const assert = chai.assert;

describe(`Indexer sync XRP ${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();

  describe("construction", function () {
    const XRPMccConnection = {
      url: "https://xrplcluster.com",
      username: "",
      password: "",
    } as XrpMccCreate;

    let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
      transactionCacheSize: 2,
      blockCacheSize: 2,
      cleanupChunkSize: 2,
      activeLimit: 1,
      clientConfig: XRPMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.XRP, cachedMccClientOptionsFull);

    const config = new IndexerConfiguration();
    const credentials = new IndexerCredentials();
    const chainConfig = new ChainConfiguration();
    chainConfig.name = "XRP";
    chainConfig.mccCreate = new XrpMccCreate();
    const chainsConfig = new ChainsConfiguration();
    chainsConfig.chains.push(chainConfig);

    const indexer = new Indexer(config, chainsConfig, credentials, "XRP", true);

    indexer.cachedClient = cachedClient;
    indexer.indexerToClient.client = cachedClient.client;

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

    it("Should run indexer sync up to date", async function () {
      indexer.chainConfig.blockCollecting = "raw";
      indexer.chainConfig.syncReadAhead = 4;

      const stub1 = sinon.stub(indexer.indexerToClient, "getBlockHeightFromClient").resolves(28014614 + indexer.chainConfig.numberOfConfirmations);
      const stub2 = sinon.stub(indexer.indexerSync, "getSyncStartBlockNumber").resolves(28014611);
      //   const stub3 = sinon.stub(indexer.indexerToClient, "getBlockFromClient").resolves(TestBlockXRPAlt);

      await indexer.indexerSync.runSync(0);

      const res = await indexer.dbService.manager.findOne(DBBlockXRP, { where: { blockNumber: 28014613 } });
      expect(res.blockHash).to.eq("2919A310215E94E882ADF3FDFDAFCA33D67D82753F96F42BA35AE80799770A59");
    });
  });
});
