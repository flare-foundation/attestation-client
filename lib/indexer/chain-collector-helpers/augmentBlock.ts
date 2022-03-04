import { AlgoBlock, UtxoBlock } from "flare-mcc";
import { DBBlockBase } from "../../entity/dbBlock";


export async function augmentBlock( block: any): Promise<DBBlockBase> {
   return  {
      blockNumber: block.number,
      blockHash: block.hash,
      timestamp: block.unixTimestamp,
      response: JSON.stringify(block.data),
      confirmed: true
  } as DBBlockBase
}

export async function augmentBlockUtxo(block: UtxoBlock): Promise<DBBlockBase> {
   return  {
      blockNumber: block.number,
      blockHash: block.hash,
      timestamp: block.unixTimestamp,
      response: JSON.stringify(block.data),
      confirmed: true
  } as DBBlockBase
}

export async function augmentBlockAlgo(block: AlgoBlock): Promise<DBBlockBase> {
   return  {
      blockNumber: block.number,
      blockHash: block.hash,
      timestamp: block.unixTimestamp,
      response: JSON.stringify(block.data),
      confirmed: true
  } as DBBlockBase
}