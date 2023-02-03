//tests need appropriate api credentials for BTC and DOGE multi-chain-client to function properly

import {
  ChainType, UtxoMccCreate
} from "@flarenetwork/mcc";
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { afterEach } from "mocha";
import sinon from "sinon";
import { CachedMccClient, CachedMccClientOptionsFull } from "../../src/caching/CachedMccClient";
import { BlockProcessor, UtxoBlockProcessor } from "../../src/indexer/chain-collector-helpers/blockProcessor";
import { getFullTransactionUtxo } from "../../src/indexer/chain-collector-helpers/readTransaction";
import { Interlacing } from "../../src/indexer/interlacing";
import { DatabaseConnectOptions } from "../../src/utils/database/DatabaseConnectOptions";
import { DatabaseService } from "../../src/utils/database/DatabaseService";
import { getGlobalLogger, initializeTestGlobalLogger } from "../../src/utils/logging/logger";
import { TestBlockBTC, TestBlockDOGE, TestTxBTC, TestTxBTCFake } from "../mockData/indexMock";
import { getTestFile } from "../test-utils/test-utils";

chai.use(chaiAsPromised);

const BtcMccConnection = {
  url: "https://bitcoin-api.flare.network",
  username: "public",
  password: "d681co1pe2l3wcj9adrm2orlk0j5r5gr3wghgxt58tvge594co0k1ciljxq9glei",
} as UtxoMccCreate;

const DOGEMccConnection = {
  url: "https://dogecoin-api.flare.network",
  username: "public",
  password: "6r1e5z3w9g6qruvkzkqvz8w67yqrq5js2cmyl2f1cncbp7gpp7tqixqskuub5v70",
} as UtxoMccCreate;

describe(`Chain collector helpers, (${getTestFile(__filename)})`, () => {
  initializeTestGlobalLogger();

  describe("readTransaction", () => {
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
    const dataService = new DatabaseService(getGlobalLogger(), databaseConnectOptions, "", "", true);
    const cachedClient = new CachedMccClient(ChainType.BTC, cachedMccClientOptionsFull);
    const interlacing = new Interlacing();
    let utxoBlockProcessor: UtxoBlockProcessor;
    const tx = TestTxBTC;
    const txFake = TestTxBTCFake;
    before(async () => {
      await dataService.connect();
      await interlacing.initialize(getGlobalLogger(), dataService, ChainType.BTC, 3600, 12);
      utxoBlockProcessor = new UtxoBlockProcessor(cachedClient);
    });

    it("Should not read full transaction utxo", async () => {
      const fullTx = await getFullTransactionUtxo(cachedClient, tx, utxoBlockProcessor);
      expect(fullTx.additionalData.vinouts[0]).to.be.undefined;
    });

    it("Should read full transaction utxo", async () => {
      const fullTx = await getFullTransactionUtxo(cachedClient, txFake, utxoBlockProcessor);
      expect(fullTx.additionalData.vinouts.length).to.be.eq(1);
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

    describe("BTC", function () {
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
      let blockProcessor = new blockProcessorConst(cachedClient);

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
      let blockProcessor = new blockProcessorConst(cachedClient);

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
  });
});
