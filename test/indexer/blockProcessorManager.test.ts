import { ChainType, MCC, UtxoMccCreate } from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../lib/caching/CachedMccClient";
import { BlockProcessorManager, IBlockProcessorManagerSettings } from "../../lib/indexer/blockProcessorManager";
import { IndexerToClient } from "../../lib/indexer/indexerToClient";
import { Interlacing } from "../../lib/indexer/interlacing";
import { DatabaseService, DatabaseSourceOptions } from "../../lib/utils/databaseService";
import { getGlobalLogger } from "../../lib/utils/logger";
import { TestBlockBTC } from "../mockData/indexMock";

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

  it.skip("should processSync ", async function () {
    const block = TestBlockBTC;
    await blockProcessorManager.processSync(block);
  });
});
