import { ChainType, MCC, sleepMs, XrpMccCreate } from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../src/caching/CachedMccClient";
import { BlockProcessorManager, IBlockProcessorManagerSettings } from "../../src/indexer/blockProcessorManager";
import { IndexerToClient } from "../../src/indexer/indexerToClient";
import { Interlacing } from "../../src/indexer/interlacing";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { TestBlockXRP, TestBlockXRPAlt } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";

const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;
const sinon = require("sinon");

describe(`BlockProcessorManager (${getTestFile(__filename)})`, function () {
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
    let inToCl = new IndexerToClient(client, 1500, 2, 300);

    // const client = new MCC.BTC(BtcMccConnection);

    let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
      transactionCacheSize: 2,
      blockCacheSize: 2,
      cleanupChunkSize: 2,
      activeLimit: 1,
      clientConfig: XRPMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.XRP, cachedMccClientOptionsFull);
    const indexerToClient = new IndexerToClient(cachedClient.client);

    const databaseConnectOptions = new DatabaseConnectOptions();
    const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);
    let interlacing = new Interlacing();

    const settings: IBlockProcessorManagerSettings = {
      validateBlockBeforeProcess: false,
      validateBlockMaxRetry: 3,
      validateBlockWaitMs: 100,
    };
    let blockProcessorManager: BlockProcessorManager;

    const fake1 = sinon.fake();
    const fake2 = sinon.fake();
    let n = 0;
    before(async function () {
      await interlacing.initialize(getGlobalLogger(), dataService, ChainType.XRP, 3600, 100);
      blockProcessorManager = new BlockProcessorManager(getGlobalLogger(), cachedClient, indexerToClient, interlacing, settings, fake1, fake2);
    });

    afterEach(function () {
      sinon.restore();
    });

    it("Should processSync ", async function () {
      const block = TestBlockXRP;
      await blockProcessorManager.processSync(block);
      expect(blockProcessorManager.blockProcessors.length).to.eq(1);
      n = n + 1;

      //wait for the processor to do the job !!!NEEDS FIX!!!
      while (!fake1.called) {
        await sleepMs(100);
      }
      expect(fake1.callCount).to.be.eq(n);
    });

    it("Should not processSync twice", async function () {
      const block = TestBlockXRP;
      await blockProcessorManager.processSync(block);
      expect(blockProcessorManager.blockProcessors.length).to.eq(1);
    });

    it("Should process completed block", async function () {
      const block = TestBlockXRPAlt;
      await blockProcessorManager.process(block);
      //wait for the processor to do the job !!!NEEDS FIX!!!
      while (!fake2.called) {
        await sleepMs(100);
      }
      expect(fake2.called).to.be.true;
    });

    it("Should processSyncBlockNumber", async function () {
      await blockProcessorManager.processSyncBlockNumber(76_468_243);
      n = n + 1;
      while (fake1.callCount < 2) {
        await sleepMs(100);
      }
      expect(fake1.callCount).to.be.eq(n);
    });

    it("Should clearProcessorsUpToBlockNumber #1", function () {
      blockProcessorManager.clearProcessorsUpToBlockNumber(13);
      expect(blockProcessorManager.blockProcessors.length).to.eq(2);
    });

    it("Should clearProcessorsUpToBlockNumber #2", function () {
      blockProcessorManager.clearProcessorsUpToBlockNumber(100000000);
      expect(blockProcessorManager.blockProcessors.length).to.eq(0);
    });

    it("Should onSyncCompleted", async function () {
      await blockProcessorManager.processSyncBlockNumber(76_468_243);
      expect(blockProcessorManager.blockNumbersInProcessing.size).to.eq(1);
      blockProcessorManager.onSyncCompleted();
      expect(blockProcessorManager.blockNumbersInProcessing.size).to.eq(0);
    });
  });
});
