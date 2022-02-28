import { IAlgoGetFullTransactionRes, IXrpGetFullTransactionRes, ReadRpcInterface } from "flare-mcc";
import { IUtxoCoinbase, IUtxoGetFullTransactionRes, IUtxoGetTransactionRes, IUtxoVinTransaction } from "flare-mcc/dist/types/utxoTypes";
import { CachedMccClient } from "../../caching/CachedMccClient";
import { LimitingProcessor } from "../../caching/LimitingProcessor";

export async function readTransactionAlgo(client: ReadRpcInterface, txHash: string): Promise<IAlgoGetFullTransactionRes> {
  return (await client.getFullTransaction(txHash)) as IAlgoGetFullTransactionRes;
}

export async function readTransactionUtxo(client: ReadRpcInterface, txHash: string): Promise<IUtxoGetFullTransactionRes> {
  return (await client.getFullTransaction(txHash)) as IUtxoGetFullTransactionRes;
}

export async function getFullTransactionUtxo(client: CachedMccClient<any,any>, txid: string, processor: LimitingProcessor): Promise<IUtxoGetFullTransactionRes> {
  processor.registerTopLevelJob();
  let res = (await processor.call(() => client.getTransaction(txid))) as IUtxoGetTransactionRes;
  // console.log("Toplevel tx processed");
  
  if (res === null) {
    return null;
  }
  let response: IUtxoGetFullTransactionRes = { vinouts: [], ...res };
  let vinPromises = response.vin.map(async (vin: IUtxoVinTransaction) => {
    if (vin.txid) {
      // the in-transactions are prepended to queue in order to process them earlier
      let tx = (await processor.call(() => client.getTransaction(vin.txid), true)) as IUtxoGetTransactionRes;
      const inVout = vin.vout!;
      if (tx.vout[inVout].n != inVout) {
        throw Error("Vin and vout transaction miss match");
      }
      return tx.vout[inVout];
    } else {
      return { coinbase: vin.coinbase } as IUtxoCoinbase;
    }
  });
  let vinInputs = await Promise.all(vinPromises);
  response.vinouts = vinInputs;
  processor.markTopLevelJobDone();
  return response;
}

export async function readTransactionXrp(client: ReadRpcInterface, txHash: string): Promise<IXrpGetFullTransactionRes> {
  return (await client.getFullTransaction(txHash)) as IXrpGetFullTransactionRes;
}

export async function readTransactionDefault(client: ReadRpcInterface, txHash: string): Promise<any> {
  return await client.getFullTransaction(txHash);
}
