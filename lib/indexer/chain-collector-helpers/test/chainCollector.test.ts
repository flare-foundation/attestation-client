import { MCC, UtxoMccCreate } from "flare-mcc";
import { DBTransactionBase } from "../../../entity/dbTransaction";
import { augmentBlockSwitch } from "../augmentBlock";
import { augmentTransactionSwitch } from "../augmentTransaction";
import { processBlockTransactionsGeneric } from "../chainCollector";
import { processBlockSwitch } from "../processBlock";
import { readTransactionSwitch } from "../readTransaction";

const BtcMccConnection = {
  url: "https://bitcoin.flare.network/",
  username: "flareadmin",
  password: "mcaeEGn6CxYt49XIEYemAB-zSfu38fYEt5dV8zFmGo4=",
} as UtxoMccCreate;

describe("Test process helpers ", () => {
  let MccClient: MCC.BTC;
  before(async function () {
      MccClient = new MCC.BTC(BtcMccConnection);
  });

   it(`Test btc block processing `, async function () {
      const processBlock = processBlockSwitch(MccClient.chainType);
      const readTransaction = readTransactionSwitch(MccClient.chainType);
      const augmentTransaction = augmentTransactionSwitch(MccClient.chainType);
      const augmentBlock = augmentBlockSwitch(MccClient.chainType);
      const save =  async (transactions: DBTransactionBase[]) => {return true}

      const block = await MccClient.getBlock(723581)

      processBlockTransactionsGeneric(
        MccClient, //
        block, //
        processBlock,
        readTransaction,
        augmentTransaction,
        augmentBlock,
        save // boolean function 
      )

   });


  
})


