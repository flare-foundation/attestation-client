import { ChainType, MCC, UtxoMccCreate } from "flare-mcc";
import { CachedMccClient, CachedMccClientOptions } from "../../../caching/CachedMccClient";
import { DBBlockBase } from "../../../entity/dbBlock";
import { DBTransactionBase } from "../../../entity/dbTransaction";
import { AlgoBlockProcessor, UtxoBlockProcessor, XrpBlockProcessor } from "../blockProcessor";
// import { processBlockTransactionsGeneric } from "../chainCollector";

const BtcMccConnection = {
  url: "https://bitcoin.flare.network/",
  username: "flareadmin",
  password: "mcaeEGn6CxYt49XIEYemAB-zSfu38fYEt5dV8zFmGo4=",
  rateLimitOptions: {
    maxRPS: 70,
    timeoutMs: 3000,
    retries: 2
  }
} as UtxoMccCreate;

const testNetUrl = "http://testnode3.c.aflabs.net:4001/";
const algodToken = "7f90419ceab8fde42b2bd50c44ed21c0aefebc614f73b27619549f366b060a14";

const testNetUrlIndexer = "http://testnode3.c.aflabs.net:8980/";
const token = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaadddd";

const algoCreateConfig = {
  algod: {
    url: testNetUrl,
    token: algodToken,
  },
  indexer: {
    url: testNetUrlIndexer,
    token: token,
  },
};

const XRPMccConnection = {
  url: "https://xrplcluster.com",
};

describe("Test process helpers ", () => {
  let BtcMccClient: MCC.BTC;
  let AlgoMccClient: MCC.ALGO;
  let XrpMccClient: MCC.XRP
  let save;
  before(async function () {
    BtcMccClient = new MCC.BTC(BtcMccConnection);
    AlgoMccClient = new MCC.ALGO(algoCreateConfig);
    XrpMccClient = new MCC.XRP(XRPMccConnection);
    save = async (block: DBBlockBase, transactions: DBTransactionBase[]) => {
      // console.log(transactions);
      console.log(transactions.length);
      return true;
    };
  });

  it(`Test btc block processing `, async function () {

    // const block = await MccClient.getBlock(723581);
    const block = await BtcMccClient.getBlock(723746);
    const block2 = await BtcMccClient.getBlock(723746);  // simulation of other block

    // console.log(block)

    let defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: BtcMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.BTC, defaultCachedMccClientOptions);

    let processor = new UtxoBlockProcessor(cachedClient);
    processor.debugOn("FIRST");
    processor.initializeJobs(block, save);

    let processor2 = new UtxoBlockProcessor(cachedClient);
    processor2.debugOn("SECOND");
    processor2.initializeJobs(block2, save);

    // Simulation of switching between the two processors
    let first = false;
    processor.pause()

    function simulate() {
      if (first) {
        console.log("RUNNING 2 ...");
        processor.pause();
        processor2.continue()
        first = false;
        setTimeout(() => {simulate()}, 10000)
      } else {
        console.log("RUNNING 1 ...");
        processor2.pause()
        processor.continue();
        first = true;
        setTimeout(() => {simulate()}, 20000)
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

  it.only(`Test btc new block processing `, async function () {

    const block = await BtcMccClient.getBlock(723746);

    let defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: BtcMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.BTC, defaultCachedMccClientOptions);

    let processor = new UtxoBlockProcessor(cachedClient);
    processor.debugOn("FIRST");
    processor.initializeJobs(block, save);
  });

  it.only(`Test algo block processing `, async function () {

    // const block = await MccClient.getBlock(723581);
    const block = await AlgoMccClient.getBlock(723746);
    // const block2 = await BtcMccClient.getBlock(723746);  // simulation of other block

    // console.log(block)

    let defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: algoCreateConfig,
    };

    const cachedClient = new CachedMccClient(ChainType.ALGO, defaultCachedMccClientOptions);

    let processor = new AlgoBlockProcessor(cachedClient);
    processor.debugOn("FIRST");
    processor.initializeJobs(block, save);
  });


  it.only(`Test xrp block processing `, async function () {
    const block = await XrpMccClient.getBlock(70_015_100);

    let defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 70,
      clientConfig: XRPMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.XRP, defaultCachedMccClientOptions);

    let processor = new XrpBlockProcessor(cachedClient);
    processor.debugOn("FIRST");
    processor.initializeJobs(block, save);
  });

});
