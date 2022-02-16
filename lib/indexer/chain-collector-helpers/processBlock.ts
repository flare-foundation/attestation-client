import { ChainType } from "flare-mcc";


export function processBlockSwitch(chainType: ChainType) {
   switch (chainType) {
      case ChainType.XRP:
         return processBlockXrp
      case ChainType.BTC:
      case ChainType.LTC:
      case ChainType.DOGE:
      case ChainType.ALGO:
      default:
         return processBlockDefault
   }
}

function processBlockXrp(block:any): Map<string, any> {
   const repMap =  new Map<string, any>();
   for(let trans of block.result.ledger.transactions){
      repMap.set(trans.hash,trans)
   }
   return repMap
}

function processBlockDefault(block:any):  Map<string, null> {
   return new Map<string, null>()
}