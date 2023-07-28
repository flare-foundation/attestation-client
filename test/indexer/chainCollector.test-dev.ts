// yarn test test/indexer/chainCollector.test-dev.ts

import { ChainType, MCC, traceManager, UtxoMccCreate } from "@flarenetwork/mcc";
import { ChainConfig } from "../../src/attester/configs/ChainConfig";
import { CachedMccClient, CachedMccClientOptions } from "../../src/caching/CachedMccClient";
import { DBBlockBase } from "../../src/entity/indexer/dbBlock";
import { DBTransactionBase } from "../../src/entity/indexer/dbTransaction";
import { AlgoBlockProcessor, BtcBlockProcessor, XrpBlockProcessor } from "../../src/indexer/chain-collector-helpers/blockProcessor";
import { Indexer } from "../../src/indexer/indexer";
import { getGlobalLogger } from "../../src/utils/logging/logger";

const BtcMccConnection = {
  url: "https://bitcoin.flare.network/",
  username: "flareadmin",
  password: "mcaeEGn6CxYt49XIEYemAB-zSfu38fYEt5dV8zFmGo4=",
  rateLimitOptions: {
    maxRPS: 70,
    timeoutMs: 3000,
    retries: 2,
  },
} as UtxoMccCreate;

const testNetUrl = "http://testnode3.c.aflabs.net:4001/";
const algodToken = "7f90419ceab8fde42b2bd50c44ed21c0aefebc614f73b27619549f366b060a14";

const testNetUrlIndexer = "http://testnode3.c.aflabs.net:8980/";
const token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddd";

const algoCreateConfig = {
  algod: {
    url: "https://node.testnet.algoexplorerapi.io", // process.env.ALGO_ALGOD_URL_TESTNET || "",
    token: process.env.ALGO_ALGOD_TOKEN_TESTNET || "",
  },
};

const XRPMccConnection = {
  // mainnet
  //url: "https://xrplcluster.com",

  // testnet
  url: "https://s.altnet.rippletest.net:51234",
};

describe("Test process helpers ", () => {
  let BtcMccClient: MCC.BTC;
  let AlgoMccClient: MCC.ALGO;
  let XrpMccClient: MCC.XRP;
  let save;

  let indexer: Indexer;
  before(async function () {
    indexer = new Indexer(null, null, null);

    traceManager.displayStateOnException = false;

    BtcMccClient = new MCC.BTC(BtcMccConnection);
    AlgoMccClient = new MCC.ALGO(algoCreateConfig);
    XrpMccClient = new MCC.XRP(XRPMccConnection);
    save = async (block: DBBlockBase, transactions: DBTransactionBase[]) => {
      console.log("***************** BLOCK SAVE ************************");

      const newDb = new (indexer.dbTransactionClasses[1] as any)();

      //Object.setPrototypeOf( transactions[0] , Object.getPrototypeOf( indexer.dbTransactionClasses[1] ) )
      Object.setPrototypeOf(transactions[0], Object.getPrototypeOf(newDb));

      console.log(block);

      console.log(transactions.length);

      console.log(transactions);

      return true;
    };
  });

  it(`Test btc block processing `, async function () {
    // const block = await MccClient.getBlock(723581);
    const block = await BtcMccClient.getFullBlock(723746);
    const block2 = await BtcMccClient.getFullBlock(723746); // simulation of other block

    // console.log(block)

    const defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: BtcMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.BTC, defaultCachedMccClientOptions);
    indexer.cachedClient = cachedClient;

    const processor = new BtcBlockProcessor(indexer.cachedClient);
    processor.debugOn("FIRST");
    processor.initializeJobs(block, save).then(() => {}).catch(e => {
      getGlobalLogger().error("Initialize jobs failed for processor 1")
    });

    const processor2 = new BtcBlockProcessor(indexer.cachedClient);
    processor2.debugOn("SECOND");
    processor2.initializeJobs(block2, save).then(() => {}).catch(e => {
      getGlobalLogger().error("Initialize jobs failed for processor 1")
    });

    // Simulation of switching between the two processors
    let first = false;
    processor.pause();

    function simulate() {
      if (first) {
        console.log("RUNNING 2 ...");
        processor.pause();
        processor2.resume().then(() => {}).catch(e => {
          getGlobalLogger().error("Resume failed for processor 2")
        });
        first = false;
        setTimeout(() => {
          simulate();
        }, 10000);
      } else {
        console.log("RUNNING 1 ...");
        processor2.pause();
        processor.resume().then(() => {}).catch(e => {
          getGlobalLogger().error("Resume failed for processor 2")
        });
        first = true;
        setTimeout(() => {
          simulate();
        }, 20000);
      }
    }

    simulate();
    // await processBlockUtxo(cachedClient, block, save);
    // await processBlockTransactionsGeneric(
    //   BtcMccClient, //
    //   block, //
    //   functions.preProcessBlock,
    //   functions.readTransaction,
    //   functions.augmentTransaction,
    //   functions.augmentBlock,
    //   save // boolean function
    // )
  });

  it(`Test btc new block processing `, async function () {
    const block = await BtcMccClient.getFullBlock(723746);

    const defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: BtcMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.BTC, defaultCachedMccClientOptions);
    indexer.cachedClient = cachedClient;

    const processor = new BtcBlockProcessor(indexer.cachedClient);
    processor.debugOn("FIRST");    
    await processor.initializeJobs(block, save);
  });

  it(`Test algo block processing `, async function () {
    const block = await AlgoMccClient.getBlock(723746);

    // console.log(block)

    const defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: algoCreateConfig,
    };

    const cachedClient = new CachedMccClient(ChainType.ALGO, defaultCachedMccClientOptions);
    indexer.cachedClient = cachedClient;

    const processor = new AlgoBlockProcessor(indexer.cachedClient);
    processor.debugOn("FIRST");
    await processor.initializeJobs(block, save);
  });

  it(`Test xrp block processing `, async function () {
    const block = await XrpMccClient.getFullBlock("FDD11CCFB38765C2DA0B3E6D4E3EF7DFDD4EE1DBBA4F319493EB6E1376814EC2");

    const defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: XRPMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.XRP, defaultCachedMccClientOptions);
    indexer.cachedClient = cachedClient;

    indexer.chainConfig = new ChainConfig();
    indexer.chainConfig.name = "XRP";
    indexer.prepareTables();


    const processor = new XrpBlockProcessor(indexer.cachedClient);
    processor.debugOn("FIRST");
    await processor.initializeJobs(block, save);
  });

  it(`Test ALGO block processing `, async function () {
    const block = await AlgoMccClient.getBlock(25254303);

    const defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: algoCreateConfig,
    };

    const cachedClient = new CachedMccClient(ChainType.ALGO, defaultCachedMccClientOptions);
    indexer.cachedClient = cachedClient;

    indexer.chainConfig = new ChainConfig();
    indexer.chainConfig.name = "ALGO";
    indexer.prepareTables();

    const processor = new AlgoBlockProcessor(indexer.cachedClient);
    processor.debugOn("FIRST");
    await processor.initializeJobs(block, save);
  });
});
