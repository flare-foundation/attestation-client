import { ChainType, XrpMccCreate } from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../lib/caching/CachedMccClient";
import { DBBlockXRP } from "../../lib/entity/indexer/dbBlock";
import { DBTransactionXRP0 } from "../../lib/entity/indexer/dbTransaction";
import { BlockProcessorManager } from "../../lib/indexer/blockProcessorManager";
import { HeaderCollector } from "../../lib/indexer/headerCollector";
import { Indexer } from "../../lib/indexer/indexer";
import { IndexerConfiguration, IndexerCredentials } from "../../lib/indexer/IndexerConfiguration";
import { IndexerSync } from "../../lib/indexer/indexerSync";
import { IndexerToClient } from "../../lib/indexer/indexerToClient";
import { IndexerToDB } from "../../lib/indexer/indexerToDB";
import { Interlacing } from "../../lib/indexer/interlacing";
import { ChainConfiguration } from "../../lib/source/ChainConfiguration";

import { DatabaseConnectOptions, DatabaseService } from "../../lib/utils/databaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import { setRetryFailureCallback } from "../../lib/utils/PromiseTimeout";
import { TestBlockXRPFake } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";

const sinon = require("sinon");
const chai = require("chai");
const expect = chai.expect;
chai.use(require("chai-as-promised"));

describe(`Indexer end to end tests (${getTestFile(__filename)})`, function () {
  initializeTestGlobalLogger();

  setRetryFailureCallback(console.log);

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

  const config = new IndexerConfiguration();
  const credentials = new IndexerCredentials();
  const chainConfig = new ChainConfiguration();
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

  const indexer = new Indexer(null, null, null, null);
  indexer.config = config;
  indexer.chainConfig = chainConfig;
  indexer.credentials = credentials;
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
  });

  afterEach(function () {
    sinon.restore();
  });

  it("should initialize interlace", function () {
    let res = indexer.interlace.getActiveTransactionWriteTable();
    expect(res).to.eq(DBTransactionXRP0);
  });

  it("Should not save a block with wrong blocknumber", async function () {
    const testBlock = new DBBlockXRP();
    testBlock.blockHash = "2DC82E21AC08DD1565246D92E1260297FB8B63D40B8DB64752A8117F6326B5B9";
    testBlock.blockNumber = 5;
    testBlock.timestamp = Date.now();
    testBlock.transactions = 0;
    let res = await indexer.blockSave(testBlock, []);
    expect(res).to.be.false;
    expect(indexer.N).to.eq(1);
  });

  //If you want to save transaction into with empty database it fails

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

    const stub = sinon.stub(indexer.indexerToClient.client, "getBlock").resolves(TestBlockXRPFake);

    const res = await indexer.blockCompleted(testBlock, [testTx]);

    expect(stub.called).to.be.true;
    expect(res).to.be.true;
    expect(indexer.N).to.eq(3);
  });
});
