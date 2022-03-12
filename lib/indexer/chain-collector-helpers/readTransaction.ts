import { UtxoTransaction } from "flare-mcc";
import { IUtxoCoinbase, IUtxoVinTransaction } from "flare-mcc/dist/types/utxoTypes";
import { CachedMccClient } from "../../caching/CachedMccClient";
import { LimitingProcessor } from "../../caching/LimitingProcessor";
import { getGlobalLogger } from "../../utils/logger";



export async function getFullTransactionUtxo(client: CachedMccClient<any, any>, blockTransaction: UtxoTransaction, processor: LimitingProcessor): Promise<UtxoTransaction> {
  let errorPoint = 0;

  try {
    processor.registerTopLevelJob();
    // let res = (await processor.call(() => client.getTransaction(txid))) as UtxoTransaction;
    // console.log("Toplevel tx processed");

    // const txid = `d279fb08798f8b37fe80fcd29aa146268d3efac542552ca829d3bc780e0d0083`;

    // let test = await client.getTransaction(txid);

    // console.log( test );


    // if (res === null) {
    //   return null;
    // }
    // let response: IUtxoGetFullTransactionRes = { vinouts: [], ...res.data };

    // here we could check if reference starts with 0x46425052 ()
    if (blockTransaction.reference.length > 0) {

      let txPromises = blockTransaction.data.vin.map((vin: IUtxoVinTransaction) => {
        if (vin.txid) {
          // the in-transactions are prepended to queue in order to process them earlier
          return (processor.call(() => client.getTransaction(vin.txid), true)) as Promise<UtxoTransaction>;
        }
      });

      errorPoint=1;

      let vinTransactions = await Promise.all(txPromises as any);

      const vinInputs = [];

      errorPoint=2;

      for (let i = 0; i < blockTransaction.data.vin.length; i++) {
        const vin = blockTransaction.data.vin[i];
        const tx = vinTransactions[i] as UtxoTransaction;

        errorPoint = i * 100;

        if (tx) {
          const inVout = vin.vout!;
          if (tx.data.vout[inVout].n != inVout) {
            throw Error("Vin and vout transaction miss match");
          }
          vinInputs.push(tx.data.vout[inVout]);
        }
        else {
          vinInputs.push({ coinbase: vin.coinbase } as IUtxoCoinbase);
        }
      }

      errorPoint=3;
      blockTransaction.fullData = { vinouts: [], ...blockTransaction.fullData };

      blockTransaction.fullData.vinouts = vinInputs;
      processor.markTopLevelJobDone();

      errorPoint=4;

      return blockTransaction;
    }
    else {
      return blockTransaction
    }
  }
  catch (error) {
    getGlobalLogger().error2(`getFullTransactionUtxo2 ${error} ${errorPoint}`);
    console.log( error.stack );
  }
}
