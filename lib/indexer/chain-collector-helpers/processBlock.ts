import { IAlgoGetBlockRes } from "flare-mcc";


export function processBlockXrp(block:any): Map<string, any> {
   const repMap =  new Map<string, any>();
   for(let trans of block.result.ledger.transactions){
      repMap.set(trans.hash,trans)
   }
   return repMap
}

export function processBlockAlgo(block:IAlgoGetBlockRes): Map<string, any> {
   const repMap =  new Map<string, any>();
   for(let trans of block.transactions){
      repMap.set(trans.id,trans)
   }
   return repMap
}


export function processBlockDefault(block:any):  Map<string, null> {
   return new Map<string, null>()
}