// yarn test test/indexer/indexerSync.test-cred.ts

import { ChainType, UtxoMccCreate } from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../lib/caching/CachedMccClient";
import { DBBlockBTC } from "../../lib/entity/indexer/dbBlock";
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

describe(`Indexer sync BTC ${getTestFile(__filename)})`, () => {
  // initializeTestGlobalLogger();

  describe("construction", function () {
    const BTCMccConnection = {
      url: "https://bitcoin-api.flare.network",
      username: "public",
      password: "",
    } as UtxoMccCreate;

    let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
      transactionCacheSize: 2,
      blockCacheSize: 2,
      cleanupChunkSize: 2,
      activeLimit: 1,
      clientConfig: BTCMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);

    const config = new IndexerConfiguration();
    const credentials = new IndexerCredentials();
    const chainConfig = new ChainConfiguration();
    chainConfig.name = "BTC";
    chainConfig.mccCreate = new UtxoMccCreate();
    const chainsConfig = new ChainsConfiguration();
    chainsConfig.chains.push(chainConfig);

    const indexer = new Indexer(config, chainsConfig, credentials, "BTC", true);

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

    //same as for XRP but does not work!!
    it.skip("Should run indexer sync up", async function () {
      indexer.chainConfig.blockCollecting = "raw";
      indexer.chainConfig.syncReadAhead = 2;

      // const stub1 = sinon.stub(indexer.indexerToClient, "getBlockHeightFromClient").resolves(771120 + indexer.chainConfig.numberOfConfirmations);
      const stub2 = sinon.stub(indexer.indexerSync, "getSyncStartBlockNumber").resolves(771129);
      //   const stub3 = sinon.stub(indexer.indexerToClient, "getBlockFromClient").resolves(TestBlockXRPAlt);

      await indexer.indexerSync.runSync(0);

      const res = await indexer.dbService.manager.findOneBy(DBBlockBTC, {});
      console.log(res, "12321");
      // expect(res.blockHash).to.eq("00000000000000000002333d6bda0bb1ede8b9007af5b1b1e7b71ac164ad760e");
    });
  });
});
