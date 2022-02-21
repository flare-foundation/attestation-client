import { RPCInterface } from "flare-mcc";
import { DBBlock } from "../../entity/dbBlock";


// export function augmentBlockSwitch(chainType: ChainType) {
//    switch (chainType) {
//       case ChainType.XRP:
//       case ChainType.BTC:
//       case ChainType.LTC:
//       case ChainType.DOGE:
//       case ChainType.ALGO:
//       default:
//          return augmentBlockDefault
//    }
// }


export async function augmentBlockDefault(client: RPCInterface, block: any): Promise<DBBlock> {
   return  {
      blockNumber: 0,
      blockHash: "hash",
      timestamp: 0,
      response: "json",
  } as DBBlock
}