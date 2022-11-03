// yarn test test/indexer/chainCollector.test-dev.ts

import { ChainType, MCC, traceManager, UtxoMccCreate } from "@flarenetwork/mcc";
import { CachedMccClient, CachedMccClientOptions } from "../../lib/caching/CachedMccClient";
import { ChainConfiguration } from "../../lib/chain/ChainConfiguration";
import { DBBlockBase } from "../../lib/entity/indexer/dbBlock";
import { DBTransactionBase } from "../../lib/entity/indexer/dbTransaction";
import { AlgoBlockProcessor, UtxoBlockProcessor, XrpBlockProcessor } from "../../lib/indexer/chain-collector-helpers/blockProcessor";
import { Indexer } from "../../lib/indexer/indexer";

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
    indexer = new Indexer(null, null, null, null);

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
    const block = await BtcMccClient.getBlock(723746);
    const block2 = await BtcMccClient.getBlock(723746); // simulation of other block

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

    const processor = new UtxoBlockProcessor(indexer);
    processor.debugOn("FIRST");
    let procA = processor.initializeJobs(block, save);

    const processor2 = new UtxoBlockProcessor(indexer);
    processor2.debugOn("SECOND");
    let procB = processor2.initializeJobs(block2, save);

    // Simulation of switching between the two processors
    let first = false;
    processor.pause();

    function simulate() {
      if (first) {
        console.log("RUNNING 2 ...");
        processor.pause();
        procB = processor2.resume();
        first = false;
        setTimeout(() => {
          simulate();
        }, 10000);
      } else {
        console.log("RUNNING 1 ...");
        processor2.pause();
        procA = processor.resume();
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
    const block = await BtcMccClient.getBlock(723746);

    const defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: BtcMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.BTC, defaultCachedMccClientOptions);
    indexer.cachedClient = cachedClient;

    const processor = new UtxoBlockProcessor(indexer);
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

    const processor = new AlgoBlockProcessor(indexer);
    processor.debugOn("FIRST");
    await processor.initializeJobs(block, save);
  });

  it(`Test xrp block processing `, async function () {
    const block = await XrpMccClient.getBlock("FDD11CCFB38765C2DA0B3E6D4E3EF7DFDD4EE1DBBA4F319493EB6E1376814EC2");

    const defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: XRPMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.XRP, defaultCachedMccClientOptions);
    indexer.cachedClient = cachedClient;

    indexer.chainConfig = new ChainConfiguration();
    indexer.chainConfig.name = "XRP";
    indexer.prepareTables();

    const processor = new XrpBlockProcessor(indexer);
    processor.debugOn("FIRST");
    await processor.initializeJobs(block, save);
  });

  it.only(`Test ALGO block processing `, async function () {
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

    indexer.chainConfig = new ChainConfiguration();
    indexer.chainConfig.name = "ALGO";
    indexer.prepareTables();

    const processor = new AlgoBlockProcessor(indexer);
    processor.debugOn("FIRST");
    await processor.initializeJobs(block, save);
  });
});
