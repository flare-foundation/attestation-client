import { ChainType, IXrpGetFullTransactionRes, RPCInterface, IAlgoGetFulTransactionRes} from "flare-mcc";
import { IUtxoGetFullTransactionRes } from "flare-mcc/dist/types/utxoTypes";


export function readTransactionSwitch(chainType: ChainType) {
   switch (chainType) {
      case ChainType.ALGO:
        return readTransactionAlgo
      case ChainType.XRP:
        return readTransactionXrp
      case ChainType.BTC:
      case ChainType.LTC:
      case ChainType.DOGE:
        return readTransactionUtxo
      default:
         return readTransactionDefault
   }
}

async function readTransactionAlgo(client: RPCInterface, txHash: string):  Promise<IAlgoGetFulTransactionRes> {
  return await client.getFullTransaction(txHash) as IAlgoGetFulTransactionRes
}

async function readTransactionUtxo(client: RPCInterface, txHash: string):  Promise<IUtxoGetFullTransactionRes> {
  return await client.getFullTransaction(txHash) as IUtxoGetFullTransactionRes
}


async function readTransactionXrp(client: RPCInterface, txHash: string):  Promise<IXrpGetFullTransactionRes> {
  return await client.getFullTransaction(txHash) as IXrpGetFullTransactionRes
}


async function readTransactionDefault(client: RPCInterface, txHash: string):  Promise<any> {
  return await client.getFullTransaction(txHash)
}