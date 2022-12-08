import { ChainType, MCC, UtxoMccCreate } from "@flarenetwork/mcc";
import { Indexer } from "../../lib/indexer/indexer";
import { DBBlockBTC, DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { ChainConfiguration } from "../../lib/chain/ChainConfiguration";
import { DBTransactionXRP1, DBTransactionBTC1 } from "../../lib/entity/indexer/dbTransaction";
import { CachedMccClient } from "../../lib/caching/CachedMccClient";
import { MockMccClient } from "../../lib/caching/test-utils/MockMccClient";
import { IndexerConfiguration } from "../../lib/indexer/IndexerConfiguration";
import { IndexerToClient } from "../../lib/indexer/indexerToClient";
import { Interlacing } from "../../lib/indexer/interlacing";
import { getGlobalLogger } from "../../lib/utils/logger";
import { DatabaseService, DatabaseSourceOptions } from "../../lib/utils/databaseService";
import { IndexerToDB } from "../../lib/indexer/indexerToDB";
import { BlockProcessorManager } from "../../lib/indexer/blockProcessorManager";
import { AugTestBlockBTC, promAugTxBTC0 } from "../mockData/indexMock";
import { HeaderCollector } from "../../lib/indexer/headerCollector";

const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;
const assert = chai.assert;
const sinon = require("sinon");

describe("Indexer XRP", () => {
  let indexer = new Indexer(null, null, null, null);
  indexer.chainType = ChainType.XRP;
  indexer.chainConfig = new ChainConfiguration();
  indexer.chainConfig.name = "XRP";
  indexer.config = new IndexerConfiguration();
  indexer.prepareTables();
  const mockMccClient = new MockMccClient();
  indexer.cachedClient = new CachedMccClient(ChainType.XRP, { forcedClient: mockMccClient });

  it("Should prepare tables", () => {
    expect(indexer.dbBlockClass).to.eq(DBBlockXRP);
    expect(indexer.dbTransactionClasses[1]).to.eq(DBTransactionXRP1);
  });

  // it.skip("Should getActiveTransactionWriteTable", () => {
  //   expect(indexer.interlace.getActiveTransactionWriteTable()).to.eq(DBTransactionXRP0);
  // });

  // it.skip("Should getBlockFromClient mock", async () => {
  //   let block = await indexer.indexerToClient.getBlockFromClient("nekej", 755_00_693);
  //   expect(block.number).to.be.equal(755_00_693);
  // });

  // it("Should getBlockFromClientbyHash mock", async () => {
  //   let block = await indexer.indexerToClient.getBlockFromClientByHash("nekej", "0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
  //   expect(block.blockHash).to.be.equal("0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
  // });

  it("Should get syncTimeDays", () => {
    expect(indexer.syncTimeDays()).to.be.eq(2);
    indexer.chainConfig.syncTimeDays = 3;
    expect(indexer.syncTimeDays()).to.be.eq(3);
  });

  // it("Should getStateEntry", () => {
  //   const state = getStateEntry("something", indexer.chainConfig.name, 42);
  //   expect(state.name).to.be.eq("XRP_something");
  //   expect(state.valueNumber).to.be.eq(42);
  // });

  // it("Should getStateEntryString", () => {
  //   const state = getStateEntryString("something", indexer.chainConfig.name, "something else", 42);
  //   expect(state.name).to.be.eq("XRP_something");
  //   expect(state.valueString).to.be.eq("something else");
  // });
});

describe.skip("Indexer BTC", () => {
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

  let indexer = new Indexer(null, null, null, null);
  indexer.chainType = ChainType.BTC;
  indexer.chainConfig = new ChainConfiguration();
  indexer.chainConfig.name = "btc";
  indexer.config = new IndexerConfiguration();
  indexer.prepareTables();
  indexer.logger = getGlobalLogger();

  indexer.interlace = new Interlacing();
  indexer.cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptions);
  indexer.indexerToClient = new IndexerToClient(indexer.cachedClient.client);

  const databaseConnectOptions = new DatabaseSourceOptions();
  databaseConnectOptions.database = process.env.DATABASE_NAME1;
  databaseConnectOptions.username = process.env.DATABASE_USERNAME;
  databaseConnectOptions.password = process.env.DATBASE_PASS;
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions);

  const fake1 = sinon.fake();
  const fake2 = sinon.fake();
  indexer.dbService = dataService;
  before(async function () {
    if (!dataService.dataSource.isInitialized) {
      await dataService.init();
    }
    const tableName1 = "state";
    await dataService.connection.query(`TRUNCATE ${tableName1};`);
    const tableName2 = "btc_transactions0";
    await dataService.connection.query(`TRUNCATE ${tableName2};`);
    const tableName3 = "btc_transactions1";
    await dataService.connection.query(`TRUNCATE ${tableName3};`);

    indexer.indexerToDB = new IndexerToDB(getGlobalLogger(), dataService, ChainType.BTC);
    indexer.interlace.initialize(getGlobalLogger(), dataService, ChainType.BTC, 36000, 10);
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

  it("Should prepare tables", () => {
    expect(indexer.dbBlockClass).to.eq(DBBlockBTC);
    expect(indexer.dbTransactionClasses[1]).to.eq(DBTransactionBTC1);
  });

  // it.skip("Should getActiveTransactionWriteTable", () => {
  //   expect(indexer.interlace.getActiveTransactionWriteTable()).to.eq(DBTransactionBTC0);
  // });

  // it.skip("Should getBlockFromClient mock", async () => {
  //   let block = await indexer.indexerToClient.getBlockFromClient("nekej", 755_00_693);
  //   expect(block.number).to.be.equal(755_00_693);
  // });

  // it("Should getBlockFromClientbyHash mock", async () => {
  //   let block = await indexer.indexerToClient.getBlockFromClientByHash("nekej", "0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
  //   expect(block.blockHash).to.be.equal("0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
  // });

  // it("Should getBlockHeaderFromClientbyHash mock", async () => {
  //   let block = await indexer.indexerToClient.getBlockHeaderFromClientByHash("nekej", "0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
  //   expect(block.blockHash).to.be.equal("0F12C5AA5B4334E67FD2BA9BD407A39C74C483C7D3CFA0218A3C9C83B59374F8");
  // });

  // it.skip("Should getBlockNumberTimestampFromClient mock", async () => {
  //   let timestamp = await indexer.indexerToClient.getBlockNumberTimestampFromClient(755_00_693);
  //   expect(timestamp).to.be.equal(1648480395);
  // });

  it("Should get syncTimeDays", () => {
    expect(indexer.syncTimeDays()).to.be.eq(2);
    indexer.chainConfig.syncTimeDays = 3;
    expect(indexer.syncTimeDays()).to.be.eq(3);
  });

  it("should not blockSave with wrong height", async function () {
    await expect(indexer.blockSave(AugTestBlockBTC, [await promAugTxBTC0])).to.be.rejected;
  });

  it("should blockSave with no transactions ", async function () {
    indexer.N = 729409;
    await indexer.blockSave(AugTestBlockBTC, []);
  });

  // it("Should getStateEntry", () => {
  //   const state = getStateEntry("something", indexer.chainConfig.name, 42);
  //   expect(state.name).to.be.eq("BTC_something");
  //   expect(state.valueNumber).to.be.eq(42);
  // });

  // it("Should getStateEntryString", () => {
  //   const state = getStateEntryString("something", indexer.chainConfig.name, "something else", 42);
  //   expect(state.name).to.be.eq("BTC_something");
  //   expect(state.valueString).to.be.eq("something else");
  // });
});
