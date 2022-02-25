import { ChainType, MCC, UtxoMccCreate } from "flare-mcc";
import { CachedMccClient, CachedMccClientOptions } from "../../../caching/CachedMccClient";
import { DBBlockBase } from "../../../entity/dbBlock";
import { DBTransactionBase } from "../../../entity/dbTransaction";
import { AlgoProcessBlockFunction, processBlockUtxo, UtxoProcessBlockFunction } from "../../chainCollector";
import { processBlockTransactionsGeneric } from "../chainCollector";

const BtcMccConnection = {
  url: "https://bitcoin.flare.network/",
  username: "flareadmin",
  password: "mcaeEGn6CxYt49XIEYemAB-zSfu38fYEt5dV8zFmGo4=",
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

describe("Test process helpers ", () => {
  let BtcMccClient: MCC.BTC;
  let AlgoMccClient: MCC.ALGO;
  let save;
  before(async function () {
    console.log("Before");
    
    BtcMccClient = new MCC.BTC(BtcMccConnection);
    AlgoMccClient = new MCC.ALGO(algoCreateConfig);
    save = async (block: DBBlockBase, transactions: DBTransactionBase[]) => {
      console.log(transactions);
      return true;
    };

    console.log("Before done");
    
  });

  it.only(`Test btc block processing `, async function () {
    console.log("Neki");
    
    // const block = await MccClient.getBlock(723581);
    const block = await BtcMccClient.getBlock(723746);

    let defaultCachedMccClientOptions: CachedMccClientOptions = {
      transactionCacheSize: 100000,
      blockCacheSize: 100000,
      cleanupChunkSize: 100,
      activeLimit: 50,
      clientConfig: BtcMccConnection,
    };

    const cachedClient = new CachedMccClient(ChainType.BTC, defaultCachedMccClientOptions);

    await processBlockUtxo(cachedClient, block, save);
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

  it.skip(`Test algo block processing `, async function () {
    const functions = AlgoProcessBlockFunction;
    const block = await AlgoMccClient.getBlock(19_300_000);

    console.log(block);

    await processBlockTransactionsGeneric(
      AlgoMccClient, //
      block, //
      functions.preProcessBlock,
      functions.readTransaction,
      functions.augmentTransaction,
      functions.augmentBlock,
      save // boolean function
    );
  });
});
