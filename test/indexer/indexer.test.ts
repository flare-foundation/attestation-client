// yarn test test/indexer/indexer.test.ts

import { ChainType, XrpMccCreate } from "@flarenetwork/mcc";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { afterEach } from "mocha";
import process from "process";
import sinon from "sinon";
import { ChainConfig } from "../../src/attester/configs/ChainConfig";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../src/caching/CachedMccClient";
import { DBBlockXRP } from "../../src/entity/indexer/dbBlock";
import { DBTransactionXRP0, DBTransactionXRP1 } from "../../src/entity/indexer/dbTransaction";
import { BlockProcessorManager } from "../../src/indexer/blockProcessorManager";
import { HeaderCollector } from "../../src/indexer/headerCollector";
import { Indexer } from "../../src/indexer/indexer";
import { SECONDS_PER_DAY } from "../../src/indexer/indexer-utils";
import { IndexerConfig } from "../../src/indexer/IndexerConfig";
import { IndexerSync } from "../../src/indexer/indexerSync";
import { IndexerToClient } from "../../src/indexer/indexerToClient";
import { IndexerToDB } from "../../src/indexer/indexerToDB";
import { Interlacing } from "../../src/indexer/interlacing";
import { PreparedBlock } from "../../src/indexer/preparedBlock";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { getRetryFailureCallback, setRetryFailureCallback } from "../../src/utils/helpers/promiseTimeout";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { MockMccClient } from "../caching/test-utils/MockMccClient";
import { TestBlockXRPAlt, TestBlockXRPFake, TestXRPStatus, TestXRPStatusAlt } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";

chai.use(chaiAsPromised);

describe(`Indexer XRP ${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();

  let indexer = new Indexer(null, null, null);
  indexer.chainType = ChainType.XRP;
  indexer.chainConfig = new ChainConfig();
  indexer.chainConfig.name = "XRP";
  indexer.config = new IndexerConfig();
  indexer.prepareTables();
  const mockMccClient = new MockMccClient();
  indexer.cachedClient = new CachedMccClient(ChainType.XRP, { forcedClient: mockMccClient });

  indexer.headerCollector = new HeaderCollector(getGlobalLogger(), 0, indexer.indexerToClient, indexer.indexerToDB, {
    blockCollectTimeMs: 1000,
    numberOfConfirmations: 3,
    blockCollecting: "raw",
  });

  afterEach(function () {
    sinon.restore();
  });

  it("Should get N", function () {
    let res = indexer.N;
    expect(res).to.eq(0);
  });

  it("Should update N", function () {
    indexer.N = 10;
    expect(indexer.N).to.eq(10);
  });

  it("Should prepare tables", () => {
    expect(indexer.dbBlockClass).to.eq(DBBlockXRP);
    expect(indexer.dbTransactionClasses[1]).to.eq(DBTransactionXRP1);
  });

  it("Should get syncTimeDays", () => {
    expect(indexer.syncTimeDays()).to.be.eq(2);
    indexer.chainConfig.syncTimeDays = 3;
    expect(indexer.syncTimeDays()).to.be.eq(3);
  });

  describe(`Indexer integration-ish tests`, function () {
    describe("construction", function () {
      const config = new IndexerConfig();
      config.chainConfiguration = new ChainConfig();
      config.chainConfiguration.name = "XRP";
      config.chainConfiguration.mccCreate = new XrpMccCreate();

      it("Should construct indexer", function () {
        const indexer = new Indexer(config, "XRP");
        expect(!indexer).to.be.false;
      });
    });

    describe("Methods tests", function () {
      const XRPMccConnection = {
        url: "https://xrplcluster.com",
      } as XrpMccCreate;

      let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
        transactionCacheSize: 2,
        blockCacheSize: 2,
        cleanupChunkSize: 2,
        activeLimit: 1,
        clientConfig: XRPMccConnection,
      };

      const config = new IndexerConfig();
      const chainConfig = new ChainConfig();
      chainConfig.name = "XRP";
      chainConfig.validateBlockBeforeProcess = false;
      chainConfig.validateBlockMaxRetry = 2;
      chainConfig.validateBlockWaitMs = 100;

      const cachedClient = new CachedMccClient(ChainType.XRP, cachedMccClientOptionsFull);
      const interlacing = new Interlacing();

      const logger = getGlobalLogger();

      const databaseConnectOptions = new DatabaseConnectOptions();
      const dbService = new DatabaseService(logger, databaseConnectOptions, "", "", true);

      const indexerToDB = new IndexerToDB(logger, dbService, ChainType.XRP);

      const indexerToClient = new IndexerToClient(cachedClient.client, 2000, 3, 300);

      const headerCollector = new HeaderCollector(logger, 0, indexerToClient, indexerToDB, {
        blockCollectTimeMs: 1000,
        numberOfConfirmations: 6,
        blockCollecting: "raw",
      });

      let fake1 = sinon.fake();
      let fake2 = sinon.fake();
      const blockProcessorManager = new BlockProcessorManager(
        logger,
        cachedClient,
        indexerToClient,
        interlacing,
        {
          validateBlockBeforeProcess: false,
          validateBlockMaxRetry: 2,
          validateBlockWaitMs: 100,
        },
        fake1,
        fake2
      );

      const indexer = new Indexer(null, null, null);
      indexer.config = config;
      indexer.chainConfig = chainConfig;
      indexer.chainType = ChainType.XRP;
      indexer.cachedClient = cachedClient;
      indexer.logger = logger;
      indexer.dbService = dbService;
      indexer.blockProcessorManager = blockProcessorManager;
      indexer.indexerToClient = indexerToClient;
      indexer.indexerToDB = indexerToDB;
      indexer.headerCollector = headerCollector;
      indexer.indexerSync = new IndexerSync(indexer);
      indexer.prepareTables();
      indexer.N = 1;
      indexer.interlace = interlacing;

      before(async function () {
        await dbService.connect();
        await interlacing.initialize(logger, dbService, ChainType.XRP, 36000, 12);

        for (let i = 0; i < 2; i++) {
          const tableName = `xrp_transactions${i}`;
          await dbService.manager.query(`delete from ${tableName};`);
        }
        await dbService.manager.query(`delete from xrp_block;`);
        const tableName = "state";
        await dbService.manager.query(`delete from ${tableName};`);
      });

      afterEach(function () {
        sinon.restore();
      });

      it("should initialize interlace", function () {
        let res = indexer.interlace.getActiveTransactionWriteTable();
        expect(res).to.eq(DBTransactionXRP0);
      });

      it("Should not save a block with a wrong blocknumber", async function () {
        setRetryFailureCallback((string) => {});

        const testBlock = new DBBlockXRP();
        testBlock.blockHash = "2DC82E21AC08DD1565246D92E1260297FB8B63D40B8DB64752A8117F6326B5B9";
        testBlock.blockNumber = 5;
        testBlock.timestamp = Date.now();
        testBlock.transactions = 0;
        let res = await indexer.blockSave(testBlock, []);
        expect(res).to.be.false;
        expect(indexer.N).to.eq(1);
      });

      it("Should save with transactions", async function () {
        const testBlock = new DBBlockXRP();
        testBlock.blockHash = "2DC82E21AC08DD1565246D92E1260297FB8B63D40B8DB64752A8117F6326B5B9";
        testBlock.blockNumber = 2;
        testBlock.timestamp = Date.now();
        testBlock.transactions = 1;

        const testTx = new DBTransactionXRP0();
        testTx.chainType = ChainType.XRP;
        testTx.blockNumber = 2;
        testTx.transactionId = "5BEBD97B6F7CFF8CF1D10B7B851DF044AE3FC29F81B68BE0E01F8051CA314180";
        testTx.timestamp = Date.now();

        const res = await indexer.blockSave(testBlock, [testTx]);

        const resDB = await indexer.dbService.manager.findOne(DBTransactionXRP0, { where: { blockNumber: 2 } });

        expect(res).to.be.true;
        expect(indexer.N).to.eq(2);
        expect(resDB.transactionId).to.eq("5BEBD97B6F7CFF8CF1D10B7B851DF044AE3FC29F81B68BE0E01F8051CA314180");
      });

      it("Should save without transactions", async function () {
        const testBlock = new DBBlockXRP();
        testBlock.blockHash = "2DC82E21AC08DD1565246D92E1260297FB8B63D40B8DB64752A8117F6326B5D9";
        testBlock.blockNumber = 3;
        testBlock.timestamp = Date.now();
        testBlock.transactions = 0;

        const res = await indexer.blockSave(testBlock, []);

        const resDB = await indexer.dbService.manager.findOne(DBTransactionXRP0, { where: { blockNumber: 3 } });

        expect(resDB.transactionType).to.eq("EMPTY_BLOCK_INDICATOR");
        expect(res).to.be.true;
        expect(indexer.N).to.eq(3);
      });

      it("Should execute blockCompleted for block in future", async function () {
        const testBlock = new DBBlockXRP();
        testBlock.blockHash = "2DC82E21AC08DD1565246D92E1260297FB8B63D40B8DB64752A8117F6326B5E9";
        testBlock.blockNumber = 100;
        testBlock.timestamp = Date.now();
        testBlock.transactions = 1;

        const testTx = new DBTransactionXRP0();
        testTx.chainType = ChainType.XRP;
        testTx.blockNumber = 100;
        testTx.transactionId = "5BEBD97B6F7CFF8CF1D10B7B851DF044AE3FC29F81B68BE0E01F8051CA314190";
        testTx.timestamp = Date.now();

        const res = await indexer.blockCompleted(testBlock, [testTx]);

        expect(res).to.be.true;
        expect(indexer.N).to.eq(3);
        expect(indexer.preparedBlocks.size).to.eq(1);
      });

      it.skip("Should execute blockCompleted for next block in line while not waiting", async function () {
        indexer.blockNp1hash = "RIGHTHASH";
        const testBlock = new DBBlockXRP();
        testBlock.blockHash = "RIGHTHASH";
        testBlock.blockNumber = 4;
        testBlock.timestamp = Date.now();
        testBlock.transactions = 1;

        const testTx = new DBTransactionXRP0();
        testTx.chainType = ChainType.XRP;
        testTx.blockNumber = 4;
        testTx.transactionId = "5BEBD97B6F7CFF8CF1D10B7B851DF044AE3FC29F81B68BE0E01F8051CA314190";
        testTx.timestamp = Date.now();

        const stub = sinon.stub(indexer.indexerToClient.client, "getBlock").resolves(TestBlockXRPFake);

        const res = await indexer.blockCompleted(testBlock, [testTx]);

        expect(stub.called).to.be.true;
        expect(res).to.be.true;
        expect(indexer.N).to.eq(3);
      });

      it("Should execute blockCompleted for next block in line while waiting", async function () {
        indexer.blockNp1hash = "RIGHTHASH";
        const testBlock = new DBBlockXRP();
        testBlock.blockHash = "RIGHTHASH";
        testBlock.blockNumber = 4;
        testBlock.timestamp = Date.now();
        testBlock.transactions = 1;

        const testTx = new DBTransactionXRP0();
        testTx.chainType = ChainType.XRP;
        testTx.blockNumber = 4;
        testTx.transactionId = "5BEBD97B6F7CFF8CF1D10B7B851DF044AE3FC29F81B68BE0E01F8051CA314190";
        testTx.timestamp = Date.now();

        indexer.waitNp1 = true;

        // const stub = sinon.stub(indexer.indexerToClient.client, "getBlock").resolves(TestBlockXRPFake);

        const res = await indexer.blockCompleted(testBlock, [testTx]);

        // expect(stub.called).to.be.true;
        expect(res).to.be.undefined;
        expect(indexer.N).to.eq(4);
        expect(indexer.waitNp1).to.be.false;
      });

      it("Should not execute blockAlreadyCompleted", async function () {
        let res = await indexer.blockAlreadyCompleted(TestBlockXRPAlt);
        expect(res).to.be.undefined;
      });

      it.skip("Should execute blockAlreadyCompleted", async function () {
        const stub = sinon.stub(indexer.indexerToClient.client, "getBlock").resolves(TestBlockXRPFake);
        const block = TestBlockXRPAlt;
        indexer.N = 28014611;
        indexer.blockNp1hash = "08E71799B2DDEE48F12A62626508D8F879E67FB2AB90FECECE4BC82650DA7D04";
        let res = await indexer.blockAlreadyCompleted(block);
        expect(res).to.be.undefined;
        expect(stub.called).to.be.true;
      });

      it("Should trySaveNp1Block", async function () {
        indexer.blockNp1hash = "VeryNiceHash";
        indexer.N = 200;

        const testBlock = new DBBlockXRP();
        testBlock.blockHash = "VeryNiceHash";
        testBlock.blockNumber = 201;
        testBlock.timestamp = Date.now();
        testBlock.transactions = 1;

        const testTx1 = new DBTransactionXRP0();
        testTx1.chainType = ChainType.XRP;
        testTx1.blockNumber = 201;
        testTx1.transactionId = "niceID";
        testTx1.timestamp = Date.now();

        const testTx2 = new DBTransactionXRP0();
        testTx2.chainType = ChainType.XRP;
        testTx2.blockNumber = 201;
        testTx2.transactionId = "veryNiceID";
        testTx2.timestamp = Date.now();

        const preparedBlock = new PreparedBlock(testBlock, [testTx1, testTx2]);

        indexer.preparedBlocks.set(201, [preparedBlock]);

        const res = await indexer.trySaveNp1Block();

        expect(res).to.be.true;
        expect(indexer.N).to.eq(201);
      });

      it("Should trySaveNp1Block fail #1", async function () {
        indexer.blockNp1hash = "VeryNiceHash";
        indexer.N = 200;

        const testBlock = new DBBlockXRP();
        testBlock.blockHash = "NotVeryNiceHash";
        testBlock.blockNumber = 201;
        testBlock.timestamp = Date.now();
        testBlock.transactions = 1;

        const testTx1 = new DBTransactionXRP0();
        testTx1.chainType = ChainType.XRP;
        testTx1.blockNumber = 201;
        testTx1.transactionId = "niceID";
        testTx1.timestamp = Date.now();

        const testTx2 = new DBTransactionXRP0();
        testTx2.chainType = ChainType.XRP;
        testTx2.blockNumber = 201;
        testTx2.transactionId = "veryNiceID";
        testTx2.timestamp = Date.now();

        const preparedBlock = new PreparedBlock(testBlock, [testTx1, testTx2]);

        indexer.preparedBlocks.set(201, [preparedBlock]);

        const res = await indexer.trySaveNp1Block();

        expect(res).to.be.false;
        expect(indexer.N).to.eq(200);
      });

      it("Should trySaveNp1Block fail #2", async function () {
        indexer.blockNp1hash = "VeryNiceHash";
        indexer.N = 500;

        const res = await indexer.trySaveNp1Block();

        expect(res).to.be.false;
        expect(indexer.N).to.eq(500);
      });

      it("Should not be waiting for waitForNodeSynced", async function () {
        const stub = sinon.stub(indexer.cachedClient.client, "getNodeStatus").resolves(TestXRPStatus);

        const res = await indexer.waitForNodeSynced();
        expect(res).to.be.false;
      });

      it("Should be waiting for waitForNodeSynced", async function () {
        const stub = sinon.stub(indexer.cachedClient.client, "getNodeStatus");
        stub.onFirstCall().resolves(TestXRPStatusAlt);
        stub.onSecondCall().resolves(TestXRPStatus);

        const res = await indexer.waitForNodeSynced();
        expect(res).to.be.true;
      });

      describe("Indexer sync", function () {
        const indSync = indexer.indexerSync;
        const XRP_UTD = 946_684_800;
        const fixedLatestBlockNumber = 76_754_962;
        const fixedLatestTimeStamp = XRP_UTD + 725_626_321;

        // mcc getBlock logs block number

        describe("getSyncStartBlockNumber", function () {
          it("#1", async function () {
            const stub = sinon.stub(indexer.indexerToClient, "getBlockHeightFromClient").resolves(fixedLatestBlockNumber);

            const store = indexer.chainConfig.blockCollecting;
            indexer.chainConfig.blockCollecting = "latestBlock";
            const res = await indSync.getSyncStartBlockNumber();

            indexer.chainConfig.blockCollecting = store;
            expect(res).to.eq(fixedLatestBlockNumber - 6);
          });

          it("#2", async function () {
            const stub1 = sinon.stub(indexer.indexerToClient, "getBlockHeightFromClient").resolves(fixedLatestBlockNumber);
            const stub2 = sinon
              .stub(indexer.indexerToClient, "getBlockNumberTimestampFromClient")
              .withArgs(fixedLatestBlockNumber - 6)
              .resolves(fixedLatestTimeStamp);

            const clock = sinon.useFakeTimers(fixedLatestTimeStamp * 1000 + 3000 * SECONDS_PER_DAY);

            const res = await indSync.getSyncStartBlockNumber();

            expect(res).to.eq(fixedLatestBlockNumber - 6);
          });

          it("#3", async function () {
            const fixedFakeBottomBlockNumber = fixedLatestBlockNumber - 500;
            const fixedFakeBottomTimeStamp = 725624410 + XRP_UTD;

            const clock = sinon.useFakeTimers(fixedLatestTimeStamp * 1000);

            const stub1 = sinon.stub(indexer.indexerToClient, "getBlockHeightFromClient").resolves(fixedLatestBlockNumber);
            const stub2 = sinon.stub(indexer.indexerToClient, "getBlockNumberTimestampFromClient");

            stub2.withArgs(fixedLatestBlockNumber - 6).resolves(fixedLatestTimeStamp);

            const stub3 = sinon.stub(indexer.indexerToClient, "getBottomBlockHeightFromClient").resolves(fixedFakeBottomBlockNumber);

            stub2.withArgs(fixedFakeBottomBlockNumber).resolves(fixedFakeBottomTimeStamp);
            const res = await indSync.getSyncStartBlockNumber();

            expect(res).to.eq(fixedFakeBottomBlockNumber);
          });

          it("#4", async function () {
            const fakeLatestBlockNumber = 4 * 60 * 24;
            const FakeBottomBlockNumber = 0;

            const stub1 = sinon
              .stub(indexer.indexerToClient, "getBlockHeightFromClient")
              .resolves(fakeLatestBlockNumber + indexer.chainConfig.numberOfConfirmations);
            const stub2 = sinon.stub(indexer.indexerToClient, "getBottomBlockHeightFromClient").resolves(0);
            const stub3 = sinon.stub(indexer.indexerToClient, "getBlockNumberTimestampFromClient");

            stub3.callsFake(async (n: number) => n * 60);

            const clock = sinon.useFakeTimers(4000 * SECONDS_PER_DAY);

            const res = await indSync.getSyncStartBlockNumber();
            expect(res).to.eq(2 * 60 * 24 - 2);
          });

          it("#5", async function () {
            const fakeLatestBlockNumber = 4 * 60 * 24;
            const FakeBottomBlockNumber = 2 * 60 * 24;

            const stub1 = sinon
              .stub(indexer.indexerToClient, "getBlockHeightFromClient")
              .resolves(fakeLatestBlockNumber + indexer.chainConfig.numberOfConfirmations);
            const stub2 = sinon.stub(indexer.indexerToClient, "getBottomBlockHeightFromClient").resolves(FakeBottomBlockNumber);
            const stub3 = sinon.stub(indexer.indexerToClient, "getBlockNumberTimestampFromClient");

            stub3.callsFake(async (n: number) => n * 60);

            const clock = sinon.useFakeTimers(4000 * (SECONDS_PER_DAY + 1));

            const res = await indSync.getSyncStartBlockNumber();
            expect(res).to.eq(2 * 60 * 24);
          });
        });

        describe("runSync", function () {
          it("should not run if not enabled", async function () {
            indexer.config.syncEnabled = false;

            const res = await indSync.runSync(14);
            indexer.config.syncEnabled = true;
            expect(res).to.be.undefined;
          });

          // problems in test:coverage-full
          it("should exit", async function () {
            const stub = sinon.stub(indexer.indexerToClient, "getBlockHeightFromClient").resolves(10);

            const store = indexer.chainConfig.blockCollecting;
            indexer.chainConfig.blockCollecting = "latestBlock";

            const stub2 = sinon.stub(process, "exit").withArgs(4);

            await indSync.runSync(1);
            expect(stub2.called).to.be.true;
          });
        });
      });
    });
  });
});
