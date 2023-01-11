// yarn test test/indexer/indexerSyncLTC.test-cred.ts

import { UtxoMccCreate } from "@flarenetwork/mcc";
import { CachedMccClientOptionsFull } from "../../lib/caching/CachedMccClient";
import { DBBlockLTC } from "../../lib/entity/indexer/dbBlock";
import { DBState } from "../../lib/entity/indexer/dbState";
import { DBTransactionLTC0 } from "../../lib/entity/indexer/dbTransaction";
import { Indexer } from "../../lib/indexer/indexer";
import { IndexerConfiguration, IndexerCredentials } from "../../lib/indexer/IndexerConfiguration";
import { ChainConfiguration, ChainsConfiguration } from "../../lib/source/ChainConfiguration";
import { initializeTestGlobalLogger } from "../../lib/utils/logger";
import { getTestFile } from "../test-utils/test-utils";

const sinon = require("sinon");
const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;
const assert = chai.assert;

describe(`Indexer sync LTC ${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();

  describe("construction", function () {
    const LTCMccConnection = new UtxoMccCreate();
    LTCMccConnection.url = "https://litecoin-api.flare.network";
    LTCMccConnection.username = "public";
    LTCMccConnection.password = "ntvzi4i1yne499t7vcdjqhhp92m3jvm0bb6dkpr406gkndvuns9sg6th3jd393uc";

    const config = new IndexerConfiguration();
    const credentials = new IndexerCredentials();
    const chainConfig = new ChainConfiguration();
    chainConfig.name = "LTC";
    chainConfig.mccCreate = LTCMccConnection;
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
      indexer.chainConfig.blockCollecting = "tips";
      indexer.chainConfig.syncReadAhead = 4;

      const stub1 = sinon.stub(indexer.indexerToClient, "getBlockHeightFromClient").resolves(2402421 + indexer.chainConfig.numberOfConfirmations);
      const stub2 = sinon.stub(indexer.indexerSync, "getSyncStartBlockNumber").resolves(2402419);

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
  });
});
