import {
  AlgoMccCreate, ChainType, IXrpGetBlockRes,
  IXrpGetTransactionRes,
  UtxoBlock,
  UtxoMccCreate,
  UtxoTransaction,
  XrpBlock,
  XrpMccCreate,
  XrpTransaction,
  xrp_ensure_data
} from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../lib/caching/CachedMccClient";
import { DBBlockBTC } from "../../lib/entity/indexer/dbBlock";
import { DBTransactionBTC0 } from "../../lib/entity/indexer/dbTransaction";
import { augmentBlock } from "../../lib/indexer/chain-collector-helpers/augmentBlock";
import { augmentTransactionUtxo, augmentTransactionXrp } from "../../lib/indexer/chain-collector-helpers/augmentTransaction";
import { BlockProcessor, UtxoBlockProcessor } from "../../lib/indexer/chain-collector-helpers/blockProcessor";
import { getFullTransactionUtxo } from "../../lib/indexer/chain-collector-helpers/readTransaction";
import { Interlacing } from "../../lib/indexer/interlacing";
import { DatabaseConnectOptions, DatabaseService } from "../../lib/utils/databaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../lib/utils/logger";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import * as resBTCTx from "../mockData/BTCTx.json";
import { TestBlockBTC, TestBlockDOGE, TestBlockXRP, TestTxBTC, TestTxBTCFake } from "../mockData/indexMock";
import * as resXRPBlock from "../mockData/XRPBlock.json";
import * as resXRPTx from "../mockData/XRPTx.json";

import { afterEach } from "mocha";
import sinon from "sinon";

const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;

describe("Chain collector helpers", () => {
  before(async function () {
    initializeTestGlobalLogger();
  });

  describe("augmentBlock", () => {
    it("Should create entity for a block", async () => {
      const block = new UtxoBlock(resBTCBlock);
      const augBlock = augmentBlock(DBBlockBTC, block);
      expect(augBlock.blockNumber).to.equal(729_410);
    });
  });

  describe("augmentTransaction", () => {
    it("Should create entity from a transaction for BTC", async () => {
      const block = new UtxoBlock(resBTCBlock);
      const tx = new UtxoTransaction(resBTCTx);
      const waitTx = async () => {
        return tx;
      };

      const augTx = await augmentTransactionUtxo(DBTransactionBTC0, ChainType.BTC, block, waitTx());
      expect(augTx.blockNumber).to.be.eq(729_410);
      expect(augTx.transactionId).to.be.eq("b39d8e733bf9f874c7c82019d41b6df1c829f3988694adf5ebdadb1590832225");
    });

    it("Should create entity from a transaction for XRP", async () => {
      const txHash = "A8B4D5C887D0881881A0A45ECEB8D250BF53E6CAE9EB72B9D251C590BD9087AB";
      const blockId = 75660711;
      xrp_ensure_data(resXRPTx);
      const block = new XrpBlock(resXRPBlock as unknown as IXrpGetBlockRes);

      const tx = new XrpTransaction(resXRPTx as unknown as IXrpGetTransactionRes);

      const augTx = augmentTransactionXrp(DBTransactionBTC0, block, tx);
      expect(augTx.blockNumber).to.be.eq(blockId);
      expect(augTx.transactionId).to.be.eq(txHash);
      // });
    });
  });

  describe("readTransaction", () => {
    const BtcMccConnection = {
      url: process.env.BTC_URL,
      username: process.env.BTC_USERNAME,
      password: process.env.BTC_PASSWORD,
    } as UtxoMccCreate;

    let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
      transactionCacheSize: 2,
      blockCacheSize: 2,
      cleanupChunkSize: 2,
      activeLimit: 1,
      clientConfig: BtcMccConnection,
    };

    const databaseConnectOptions = new DatabaseConnectOptions();
    databaseConnectOptions.database = process.env.DATABASE_NAME1;
    databaseConnectOptions.username = process.env.DATABASE_USERNAME;
    databaseConnectOptions.password = process.env.DATBASE_PASS;
    const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions);
    const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);
    const interlacing = new Interlacing();
    let utxoBlockProcessor: UtxoBlockProcessor;
    const tx = TestTxBTC;
    const txFake = TestTxBTCFake;
    before(async () => {
      await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 12);
      utxoBlockProcessor = new UtxoBlockProcessor(interlacing, cachedClient);
    });

    it("should not read full transaction utxo", async () => {
      const fullTx = await getFullTransactionUtxo(cachedClient, tx, utxoBlockProcessor);
      expect(fullTx.additionalData.vinouts[0]).to.be.undefined;
    });

    it("should read full transaction utxo", async () => {
      const fullTx = await getFullTransactionUtxo(cachedClient, txFake, utxoBlockProcessor);
      expect(fullTx.additionalData.vinouts.length).to.be.eq(1);
    });
  });

  describe("BlockProcessors", () => {
    const databaseConnectOptions = new DatabaseConnectOptions();
    databaseConnectOptions.database = process.env.DATABASE_NAME1;
    databaseConnectOptions.username = process.env.DATABASE_USERNAME;
    databaseConnectOptions.password = process.env.DATBASE_PASS;
    const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions);

    before(async function () {
      if (!dataService.dataSource.isInitialized) {
        await dataService.connect();
      }
    });

    afterEach(function () {
      sinon.restore();
    });

    it("should return null processor", function () {
      expect(BlockProcessor(-1)).to.be.null;
    });

    describe("BTC", function () {
      const BtcMccConnection = {
        url: process.env.BTC_URL,
        username: process.env.BTC_USERNAME,
        password: process.env.BTC_PASSWORD,
      } as UtxoMccCreate;

      let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
        transactionCacheSize: 100,
        blockCacheSize: 2,
        cleanupChunkSize: 12,
        activeLimit: 3,
        clientConfig: BtcMccConnection,
      };

      const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);
      const interlacing = new Interlacing();

      const blockProcessorConst = BlockProcessor(ChainType.BTC);
      let blockProcessor = new blockProcessorConst(interlacing, cachedClient);

      before(async function () {
        await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 10);
      });

      it("Should initializeJobs", async function () {
        const block = TestBlockBTC;
        const fake = sinon.fake();
        let res = [];
        const voidOnSave = async (blockDb, transDb) => {
          fake(blockDb, transDb);
          res = transDb;
          return true;
        };

        await blockProcessor.initializeJobs(block, voidOnSave);
        expect(res.length).to.eq(219);
        expect(fake.callCount).to.eq(1);
      });
    });

    describe("DOGE", function () {
      const DOGEMccConnection = {
        url: process.env.DOGE_URL,
        username: process.env.DOGE_USERNAME,
        password: process.env.DOGE_PASSWORD,
      } as UtxoMccCreate;

      let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
        transactionCacheSize: 1000,
        blockCacheSize: 5,
        cleanupChunkSize: 10,
        activeLimit: 5,
        clientConfig: DOGEMccConnection,
      };

      const cachedClient = new CachedMccClient(ChainType.DOGE, cachedMccClientOptionsFull);
      const interlacing = new Interlacing();

      const blockProcessorConst = BlockProcessor(ChainType.DOGE);
      let blockProcessor = new blockProcessorConst(interlacing, cachedClient);

      before(async function () {
        await interlacing.initialize(getGlobalLogger(), dataService, ChainType.DOGE, 36000, 10);
      });
      after(function () {
        blockProcessor.stop();
        blockProcessor.destroy();
      });

      it("Should initializeJobs", async function () {
        const block = TestBlockDOGE;
        const fake = sinon.fake();
        let res = [];
        const voidOnSave = async (blockDb, transDb) => {
          fake(blockDb, transDb);
          res = transDb;
          return true;
        };

        await blockProcessor.initializeJobs(block, voidOnSave);
        expect(res.length).to.eq(125);
        expect(fake.callCount).to.eq(1);
      });
    });

    describe("ALGO", function () {
      const algoCreateConfig = {
        algod: {
          url: process.env.ALGO_ALGOD_URL || "",
          token: process.env.ALGO_ALGOD_TOKEN || "",
        },
      } as AlgoMccCreate;

      let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
        transactionCacheSize: 1000,
        blockCacheSize: 5,
        cleanupChunkSize: 10,
        activeLimit: 5,
        clientConfig: algoCreateConfig,
      };

      const cachedClient = new CachedMccClient(ChainType.ALGO, cachedMccClientOptionsFull);
      const interlacing = new Interlacing();

      const blockProcessorConst = BlockProcessor(ChainType.ALGO);
      let blockProcessor = new blockProcessorConst(interlacing, cachedClient);

      before(async function () {
        await interlacing.initialize(getGlobalLogger(), dataService, ChainType.ALGO, 36000, 10);
      });
      after(function () {
        blockProcessor.stop();
        blockProcessor.destroy();
      });

      it("Should initializeJobs", async function () {
        const block = await cachedClient.client.getBlock(25400573);

        const fake = sinon.fake();
        let res = [];
        const voidOnSave = async (blockDb, transDb) => {
          fake(blockDb, transDb);
          res = transDb;
          return true;
        };

        await blockProcessor.initializeJobs(block, voidOnSave);
        expect(res.length).to.eq(67);
        expect(fake.callCount).to.eq(1);
      });
    });

    describe("XRP", function () {
      const XRPMccConnection = {
        url: process.env.XRP_URL,
        username: process.env.XRP_USERNAME || "",
        password: process.env.XRP_PASSWORD || "",
      } as XrpMccCreate;

      let cachedMccClientOptionsFull: CachedMccClientOptionsFull = {
        transactionCacheSize: 2,
        blockCacheSize: 2,
        cleanupChunkSize: 2,
        activeLimit: 1,
        clientConfig: XRPMccConnection,
      };

      const cachedClient = new CachedMccClient(ChainType.XRP, cachedMccClientOptionsFull);
      const interlacing = new Interlacing();

      const blockProcessorConst = BlockProcessor(ChainType.XRP);
      let blockProcessor = new blockProcessorConst(interlacing, cachedClient);

      before(async function () {
        await interlacing.initialize(getGlobalLogger(), dataService, ChainType.XRP, 3600, 10);
      });

      it("Should initializeJobs", async function () {
        const block = TestBlockXRP;
        const fake = sinon.fake();
        let res = [];
        const voidOnSave = async (blockDb, transDb) => {
          fake(blockDb, transDb);
          res = transDb;
          return true;
        };

        await blockProcessor.initializeJobs(block, voidOnSave);
        expect(res.length).to.eq(33);
        expect(fake.callCount).to.eq(1);
      });
    });
  });
});
