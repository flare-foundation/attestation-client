import { ChainType, UtxoMccCreate } from "@flarenetwork/mcc";
import { Indexer } from "../../src/indexer/indexer";
import { DBBlockBTC, DBBlockXRP } from "../../src/entity/indexer/dbBlock";
import { ChainConfig } from "../../src/source/ChainConfig";
import { DBTransactionXRP1, DBTransactionBTC1 } from "../../src/entity/indexer/dbTransaction";
import { CachedMccClient } from "../../src/caching/CachedMccClient";
import { MockMccClient } from "../../src/caching/test-utils/MockMccClient";
import { IndexerToClient } from "../../src/indexer/indexerToClient";
import { Interlacing } from "../../src/indexer/interlacing";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logger";
import { DatabaseService, DatabaseConnectOptions } from "../../src/utils/databaseService";
import { IndexerToDB } from "../../src/indexer/indexerToDB";
import { BlockProcessorManager } from "../../src/indexer/blockProcessorManager";
import { AugTestBlockBTC, promAugTxBTC0 } from "../mockData/indexMock";
import { HeaderCollector } from "../../src/indexer/headerCollector";
import { afterEach } from "mocha";
import { getTestFile } from "../test-utils/test-utils";
import { IndexerConfig } from "../../src/indexer/IndexerConfig";

const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;
const sinon = require("sinon");

describe(`Indexer XRP ${getTestFile(__filename)})`, () => {
  let indexer = new Indexer(null, null, null);
  indexer.chainType = ChainType.XRP;
  indexer.chainConfig = new ChainConfig();
  indexer.chainConfig.name = "XRP";
  indexer.config = new IndexerConfig();
  indexer.prepareTables();
  const mockMccClient = new MockMccClient();
  indexer.cachedClient = new CachedMccClient(ChainType.XRP, { forcedClient: mockMccClient });

  it("Should prepare tables", () => {
    expect(indexer.dbBlockClass).to.eq(DBBlockXRP);
    expect(indexer.dbTransactionClasses[1]).to.eq(DBTransactionXRP1);
  });

  it("Should get syncTimeDays", () => {
    expect(indexer.syncTimeDays()).to.be.eq(2);
    indexer.chainConfig.syncTimeDays = 3;
    expect(indexer.syncTimeDays()).to.be.eq(3);
  });
});

describe.skip(`Indexer BTC ${getTestFile(__filename)})`, () => {
  const BtcMccConnection = {
    url: process.env.BTC_URL || "",
    username: process.env.BTC_USERNAME || "",
    password: process.env.BTC_PASSWORD || "",
  } as UtxoMccCreate;

  const cachedMccClientOptions = {
    transactionCacheSize: 10,
    blockCacheSize: 3,
    cleanupChunkSize: 4,
    activeLimit: 4, // maximum number of requests that are either in processing or in queue
    clientConfig: BtcMccConnection,
  };

  initializeTestGlobalLogger();
  let indexer = new Indexer(null, null, null);
  indexer.chainType = ChainType.BTC;
  indexer.chainConfig = new ChainConfig();
  indexer.chainConfig.name = "btc";
  indexer.prepareTables();
  indexer.logger = getGlobalLogger();

  indexer.interlace = new Interlacing();
  indexer.cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptions);
  indexer.indexerToClient = new IndexerToClient(indexer.cachedClient.client);

  const databaseConnectOptions = new DatabaseConnectOptions();
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);

  const fake1 = sinon.fake();
  const fake2 = sinon.fake();
  indexer.dbService = dataService;
  before(async function () {
    if (!dataService.dataSource.isInitialized) {
      await dataService.connect();
    }
    const tableName1 = "state";
    await dataService.manager.query(`delete from ${tableName1};`);
    const tableName2 = "btc_transactions0";
    await dataService.manager.query(`delete from ${tableName2};`);
    const tableName3 = "btc_transactions1";
    await dataService.manager.query(`delete from ${tableName3};`);

    indexer.indexerToDB = new IndexerToDB(getGlobalLogger(), dataService, ChainType.BTC);
    await indexer.interlace.initialize(getGlobalLogger(), dataService, ChainType.BTC, 36000, 10);
    indexer.blockProcessorManager = new BlockProcessorManager(
      getGlobalLogger(),
      indexer.cachedClient,
      indexer.indexerToClient,
      indexer.interlace,
      { validateBlockBeforeProcess: false, validateBlockMaxRetry: 2, validateBlockWaitMs: 100 },
      fake1,
      fake2
    );

    indexer.headerCollector = new HeaderCollector(getGlobalLogger(), 0, indexer.indexerToClient, indexer.indexerToDB, {
      blockCollectTimeMs: 1000,
      numberOfConfirmations: 3,
      blockCollecting: "tips",
    });
  });

  afterEach(function () {
    sinon.restore();
  });

  it("Should prepare tables", () => {
    expect(indexer.dbBlockClass).to.eq(DBBlockBTC);
    expect(indexer.dbTransactionClasses[1]).to.eq(DBTransactionBTC1);
  });

  it("Should get syncTimeDays", () => {
    expect(indexer.syncTimeDays()).to.be.eq(2);
    indexer.chainConfig.syncTimeDays = 3;
    expect(indexer.syncTimeDays()).to.be.eq(3);
  });

  it("Should not blockSave with wrong height", async function () {
    await expect(indexer.blockSave(AugTestBlockBTC, [await promAugTxBTC0])).to.be.rejected;
  });

  it("Should blockSave with no transactions ", async function () {
    indexer.N = 729409;
    await indexer.blockSave(AugTestBlockBTC, []);
  });
});
