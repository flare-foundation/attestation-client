// yarn test test/indexer/blockProcessorManager.test-cred.ts
//tests need appropriate api credentials for BTC multi-chain-client to function properly

import { ChainType, sleepMs, UtxoMccCreate } from "@flarenetwork/mcc";
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from "sinon";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../src/caching/CachedMccClient";
import { BlockProcessorManager, IBlockProcessorManagerSettings } from "../../src/indexer/blockProcessorManager";
import { IndexerToClient } from "../../src/indexer/indexerToClient";
import { Interlacing } from "../../src/indexer/interlacing";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { TestBlockBTC, TestBlockBTCAlt } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";

chai.use(chaiAsPromised);

describe(`BlockProcessorManager (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  const databaseConnectOptions = new DatabaseConnectOptions();
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);

  before(async function () {
    if (!dataService.dataSource.isInitialized) {
      await dataService.connect();
    }
  });

  describe("BTC", function () {
    const BtcMccConnection = {
      url: "https://bitcoin-api.flare.network",
      username: "public",
      password: "",
    } as UtxoMccCreate;

    let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
      transactionCacheSize: 2,
      blockCacheSize: 2,
      cleanupChunkSize: 2,
      activeLimit: 1,
      clientConfig: BtcMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);
    const indexerToClient = new IndexerToClient(cachedClient.client);

    let interlacing = new Interlacing();

    const settings: IBlockProcessorManagerSettings = {
      validateBlockBeforeProcess: false,
      validateBlockMaxRetry: 3,
      validateBlockWaitMs: 100,
    };
    let blockProcessorManager: BlockProcessorManager;

    const fake1 = sinon.fake();
    const fake2 = sinon.fake();
    before(async function () {
      await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 100);
      blockProcessorManager = new BlockProcessorManager(getGlobalLogger(), cachedClient, indexerToClient, interlacing, settings, fake1, fake2);
    });

    afterEach(function () {
      sinon.restore();
    });

    it("Should processSync ", async function () {
      const block = TestBlockBTC;
      await blockProcessorManager.processSync(block);
      expect(blockProcessorManager.blockProcessors.length).to.eq(1);

      //wait for the processor to do the job
      while (!fake1.called) {
        await sleepMs(100);
      }
      expect(fake1.called).to.be.true;
    });

    it("Should not processSync twice", async function () {
      const block = TestBlockBTC;
      await blockProcessorManager.processSync(block);
      expect(blockProcessorManager.blockProcessors.length).to.eq(1);
    });

    it("Should process completed block", async function () {
      const block = TestBlockBTC;
      await blockProcessorManager.process(block);

      while (!fake2.called) {
        await sleepMs(100);
      }
      expect(fake2.called).to.be.true;
    });

    it("Should process uncompleted block", async function () {
      const block = TestBlockBTCAlt;
      expect(fake1.callCount).to.eq(1);

      await blockProcessorManager.process(block);

      expect(blockProcessorManager.blockProcessors[0].isActive).to.be.false;
      expect(blockProcessorManager.blockProcessors.length).to.be.eq(2);
      expect(blockProcessorManager.blockProcessors[1].isActive).to.be.true;
      while (fake1.callCount < 2) {
        await sleepMs(100);
      }
      expect(fake1.callCount).to.be.eq(2);
    });

    it("Should processSyncBlockNumber", async function () {
      await blockProcessorManager.processSyncBlockNumber(12);
      await blockProcessorManager.processSyncBlockNumber(12);
      while (fake1.callCount < 3) {
        await sleepMs(100);
      }
      expect(fake1.callCount).to.be.eq(3);
      expect(blockProcessorManager.blockNumbersInProcessing.size).to.eq(1);
    });

    it("Should clearProcessorsUpToBlockNumber #1", function () {
      blockProcessorManager.clearProcessorsUpToBlockNumber(13);
      expect(blockProcessorManager.blockProcessors.length).to.eq(2);
    });

    it("Should clearProcessorsUpToBlockNumber #2", function () {
      blockProcessorManager.clearProcessorsUpToBlockNumber(100000000);
      expect(blockProcessorManager.blockProcessors.length).to.eq(0);
    });

    it("Should onSyncCompleted", function () {
      expect(blockProcessorManager.blockNumbersInProcessing.size).to.eq(1);
      blockProcessorManager.onSyncCompleted();
      expect(blockProcessorManager.blockNumbersInProcessing.size).to.eq(0);
    });
  });
});
