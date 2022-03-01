import { MCC, UtxoMccCreate } from "flare-mcc";
import { DBBlock } from "../../../entity/dbBlock";
import { DBTransactionBase } from "../../../entity/dbTransaction";
import { AlgoProcessBlockFunction, UtxoProcessBlockFunction } from "../../chainCollector";
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
  let save
  before(async function () {
      BtcMccClient = new MCC.BTC(BtcMccConnection);
      AlgoMccClient = new MCC.ALGO(algoCreateConfig);
      save =  async (block: DBBlock, transactions: DBTransactionBase[]) => {return true}
  });

   it.skip(`Test btc block processing `, async function () {
      const functions = UtxoProcessBlockFunction

      // const block = await MccClient.getBlock(723581);
      const block = await BtcMccClient.getBlock(723746);

      await processBlockTransactionsGeneric(
        BtcMccClient, //
        block, //
        functions.preProcessBlock,
        functions.readTransaction,
        functions.augmentTransaction,
        functions.augmentBlock,
        save // boolean function 
      )
   });


   it(`Test algo block processing `, async function () {
    const functions = AlgoProcessBlockFunction
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
    )
 });
  
})


