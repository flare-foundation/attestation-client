import { UtxoTransaction } from "flare-mcc";
import { IUtxoCoinbase, IUtxoGetFullTransactionRes, IUtxoGetTransactionRes, IUtxoVinTransaction, IUtxoVoutTransaction } from "flare-mcc/dist/types/utxoTypes";
import { CachedMccClient } from "../../caching/CachedMccClient";
import { LimitingProcessor } from "../../caching/LimitingProcessor";



export async function getFullTransactionUtxo(client: CachedMccClient<any,any>, blockTransaction: UtxoTransaction, processor: LimitingProcessor): Promise<UtxoTransaction> {
  processor.registerTopLevelJob();
  // let res = (await processor.call(() => client.getTransaction(txid))) as UtxoTransaction;
  // console.log("Toplevel tx processed");
  
  // if (res === null) {
  //   return null;
  // }
  // let response: IUtxoGetFullTransactionRes = { vinouts: [], ...res.data };
  blockTransaction.fullData = { vinouts: [], ...blockTransaction.fullData };
  let vinPromises = blockTransaction.data.vin.map(async (vin: IUtxoVinTransaction) => {
    if (vin.txid) {
      // the in-transactions are prepended to queue in order to process them earlier
      let tx = (await processor.call(() => client.getTransaction(vin.txid), true)) as UtxoTransaction;
      const inVout = vin.vout!;
      if (tx.data.vout[inVout].n != inVout) {
        throw Error("Vin and vout transaction miss match");
      }
      return tx.data.vout[inVout];
    } else {
      return { coinbase: vin.coinbase } as IUtxoCoinbase;
    }
  });
  let vinInputs = await Promise.all(vinPromises);
  blockTransaction.fullData.vinouts = vinInputs;
  processor.markTopLevelJobDone();
  return blockTransaction;
}



// export async function readTransactionAlgo(client: ReadRpcInterface, txHash: string): Promise<IAlgoGetFullTransactionRes> {
//   return (await client.getTransaction(txHash)) as IAlgoGetFullTransactionRes;
// }

// export async function readTransactionUtxo(client: ReadRpcInterface, txHash: string): Promise<IUtxoGetFullTransactionRes> {
//   return (await client.getTransaction(txHash)) as IUtxoGetFullTransactionRes;
// }

// export async function readTransactionXrp(client: ReadRpcInterface, txHash: string): Promise<IXrpGetFullTransactionRes> {
//   return (await client.getTransaction(txHash)) as IXrpGetFullTransactionRes;
// }

// export async function readTransactionDefault(client: ReadRpcInterface, txHash: string): Promise<any> {
//   return await client.getTransaction(txHash);
// }
