import { ChainType, IXrpGetFullTransactionRes, RPCInterface, IAlgoGetFullTransactionRes, unPrefix0x} from "flare-mcc";
import { IUtxoGetFullTransactionRes } from "flare-mcc/dist/types/utxoTypes";


// export function readTransactionSwitch(chainType: ChainType) {
//    switch (chainType) {
//       case ChainType.ALGO:
//         return readTransactionAlgo
//       case ChainType.XRP:
//         return readTransactionXrp
//       case ChainType.BTC:
//       case ChainType.LTC:
//       case ChainType.DOGE:
//         return readTransactionUtxo
//       default:
//          return readTransactionDefault
//    }
// }

export async function readTransactionAlgo(client: RPCInterface, txHash: string):  Promise<IAlgoGetFullTransactionRes> {
  return await client.getFullTransaction(txHash) as IAlgoGetFullTransactionRes
}

export async function readTransactionUtxo(client: RPCInterface, txHash: string):  Promise<IUtxoGetFullTransactionRes> {
  return await client.getFullTransaction(txHash) as IUtxoGetFullTransactionRes
}


export async function readTransactionXrp(client: RPCInterface, txHash: string):  Promise<IXrpGetFullTransactionRes> {
  return await client.getFullTransaction(txHash) as IXrpGetFullTransactionRes
}


export async function readTransactionDefault(client: RPCInterface, txHash: string):  Promise<any> {
  return await client.getFullTransaction(txHash)
}