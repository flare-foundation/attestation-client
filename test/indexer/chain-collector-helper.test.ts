import {
  AlgoMccCreate,
  ChainType,
  IXrpGetBlockRes,
  IXrpGetTransactionRes,
  UtxoBlock,
  UtxoTransaction,
  XrpBlock,
  XrpMccCreate,
  XrpTransaction,
  xrp_ensure_data,
} from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../src/caching/CachedMccClient";
import { DBBlockBTC } from "../../src/entity/indexer/dbBlock";
import { DBTransactionBTC0 } from "../../src/entity/indexer/dbTransaction";
import { augmentBlock } from "../../src/indexer/chain-collector-helpers/augmentBlock";
import { augmentTransactionUtxo, augmentTransactionXrp } from "../../src/indexer/chain-collector-helpers/augmentTransaction";
import { BlockProcessor } from "../../src/indexer/chain-collector-helpers/blockProcessor";
import { Interlacing } from "../../src/indexer/interlacing";
import { DatabaseConnectOptions, DatabaseService } from "../../src/utils/databaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logger";
import * as resBTCBlock from "../mockData/BTCBlock.json";
import * as resBTCTx from "../mockData/BTCTx.json";
import { TestBlockXRP } from "../mockData/indexMock";
import * as resXRPBlock from "../mockData/XRPBlock.json";
import * as resXRPTx from "../mockData/XRPTx.json";

import { afterEach } from "mocha";
import sinon from "sinon";
import { getTestFile } from "../test-utils/test-utils";

const chai = require("chai");
const chaiaspromised = require("chai-as-promised");
chai.use(chaiaspromised);
const expect = chai.expect;

describe(`Chain collector helpers, (${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();

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

      const augTx = augmentTransactionXrp(block, tx);
      expect(augTx.blockNumber).to.be.eq(blockId);
      expect(augTx.transactionId).to.be.eq(txHash);
      // });
    });
  });

  describe("BlockProcessors", () => {
    const databaseConnectOptions = new DatabaseConnectOptions();
    const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);

    before(async function () {
      if (!dataService.dataSource.isInitialized) {
        await dataService.connect();
      }
    });

    afterEach(function () {
      sinon.restore();
    });

    it("Should return null processor", function () {
      expect(BlockProcessor(-1)).to.be.null;
    });

    describe("ALGO", function () {
      const algoCreateConfig = {
        algod: {
          url: "https://node.algoexplorerapi.io/",
          token: "",
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
      let blockProcessor = new blockProcessorConst(cachedClient);

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

      const cachedClient = new CachedMccClient(ChainType.XRP, cachedMccClientOptionsFull);
      const interlacing = new Interlacing();

      const blockProcessorConst = BlockProcessor(ChainType.XRP);
      let blockProcessor = new blockProcessorConst(cachedClient);

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
