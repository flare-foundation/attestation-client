import { ChainType, MCC, sleepMs, UtxoMccCreate } from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../lib/caching/CachedMccClient";
import { BlockProcessorManager, IBlockProcessorManagerSettings } from "../../lib/indexer/blockProcessorManager";
import { IndexerToClient } from "../../lib/indexer/indexerToClient";
import { Interlacing } from "../../lib/indexer/interlacing";
import { DatabaseService, DatabaseSourceOptions } from "../../lib/utils/databaseService";
import { getGlobalLogger } from "../../lib/utils/logger";
import { TestBlockBTC, TestBlockBTCAlt } from "../mockData/indexMock";

const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;
const assert = chai.assert;
const sinon = require("sinon");

const BtcMccConnection = {
  url: process.env.BTC_URL || "",
  username: process.env.BTC_USERNAME || "",
  password: process.env.BTC_PASSWORD || "",
} as UtxoMccCreate;

// const client = new MCC.BTC(BtcMccConnection);

let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
  transactionCacheSize: 2,
  blockCacheSize: 2,
  cleanupChunkSize: 2,
  activeLimit: 1,
  clientConfig: BtcMccConnection,
};

const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);

describe("BlockProcessorManager", function () {
  const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);
  const indexerToClient = new IndexerToClient(cachedClient.client);

  const databaseConnectOptions = new DatabaseSourceOptions();
  databaseConnectOptions.database = process.env.DATABASE_NAME2;
  databaseConnectOptions.username = process.env.DATABASE_USERNAME;
  databaseConnectOptions.password = process.env.DATBASE_PASS;
  const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions);
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
    if (!dataService.dataSource.isInitialized) {
      await dataService.init();
    }
    await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 100);
    blockProcessorManager = new BlockProcessorManager(getGlobalLogger(), cachedClient, indexerToClient, interlacing, settings, fake1, fake2);
  });

  afterEach(function () {
    sinon.restore();
  });

  it("should processSync ", async function () {
    const block = TestBlockBTC;
    await blockProcessorManager.processSync(block);
    expect(blockProcessorManager.blockProcessors.length).to.eq(1);

    //wait for the processor to do the job !!!NEEDS FIX!!!
    while (!fake1.called) {
      await sleepMs(100);
    }
    expect(fake1.called).to.be.true;
  });

  it("should not processSync twice", async function () {
    const block = TestBlockBTC;
    await blockProcessorManager.processSync(block);
    expect(blockProcessorManager.blockProcessors.length).to.eq(1);
  });

  it("should process completed block", async function () {
    const block = TestBlockBTC;
    await blockProcessorManager.process(block);
    //wait for the processor to do the job !!!NEEDS FIX!!!
    while (!fake2.called) {
      await sleepMs(100);
    }
    expect(fake2.called).to.be.true;
  });

  it("should process uncompleted block", async function () {
    const block = TestBlockBTCAlt;
    expect(fake1.callCount).to.eq(1);

    await blockProcessorManager.process(block);
    //wait for the processor to do the job !!!NEEDS FIX!!!
    expect(blockProcessorManager.blockProcessors[0].isActive).to.be.false;
    expect(blockProcessorManager.blockProcessors.length).to.be.eq(2);
    expect(blockProcessorManager.blockProcessors[1].isActive).to.be.true;
    while (fake1.callCount < 2) {
      await sleepMs(100);
    }
    expect(fake1.callCount).to.be.eq(2);
  });

  it("should processSyncBlockNumber", async function () {
    await blockProcessorManager.processSyncBlockNumber(12);
    await blockProcessorManager.processSyncBlockNumber(12);
    while (fake1.callCount < 3) {
      await sleepMs(100);
    }
    expect(fake1.callCount).to.be.eq(3);
    expect(blockProcessorManager.blockNumbersInProcessing.size).to.eq(1);
  });

  it("should clearProcessorsUpToBlockNumber #1", function () {
    blockProcessorManager.clearProcessorsUpToBlockNumber(13);
    expect(blockProcessorManager.blockProcessors.length).to.eq(2);
  });

  it("should clearProcessorsUpToBlockNumber #2", function () {
    blockProcessorManager.clearProcessorsUpToBlockNumber(100000000);
    expect(blockProcessorManager.blockProcessors.length).to.eq(0);
  });
});
