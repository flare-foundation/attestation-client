import { ChainType, RPCInterface } from "flare-mcc";
import { DBBlockBase } from "./types";


export function augmentBlockSwitch(chainType: ChainType) {
   switch (chainType) {
      case ChainType.XRP:
      case ChainType.BTC:
      case ChainType.LTC:
      case ChainType.DOGE:
      case ChainType.ALGO:
      default:
         return augmentBlockDefault
   }
}


async function augmentBlockDefault(client: RPCInterface, block: any): Promise<DBBlockBase> {
   return  {
    number: 0,
    saved: false
  } as DBBlockBase
}