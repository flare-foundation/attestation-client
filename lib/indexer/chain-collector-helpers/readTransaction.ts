import { IAlgoGetFullTransactionRes, IXrpGetFullTransactionRes, ReadRpcInterface } from "flare-mcc";
import { IUtxoGetFullTransactionRes } from "flare-mcc/dist/types/utxoTypes";


export async function readTransactionAlgo(client: ReadRpcInterface, txHash: string):  Promise<IAlgoGetFullTransactionRes> {
  return await client.getFullTransaction(txHash) as IAlgoGetFullTransactionRes
}

export async function readTransactionUtxo(client: ReadRpcInterface, txHash: string):  Promise<IUtxoGetFullTransactionRes> {
  return await client.getFullTransaction(txHash) as IUtxoGetFullTransactionRes
}


export async function readTransactionXrp(client: ReadRpcInterface, txHash: string):  Promise<IXrpGetFullTransactionRes> {
  return await client.getFullTransaction(txHash) as IXrpGetFullTransactionRes
}


export async function readTransactionDefault(client: ReadRpcInterface, txHash: string):  Promise<any> {
  return await client.getFullTransaction(txHash)
}