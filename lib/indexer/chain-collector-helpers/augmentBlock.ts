import { AlgoBlock, IAlgoBlockData, ReadRpcInterface, UtxoBlock } from "flare-mcc";
import { DBBlockBase } from "../../entity/dbBlock";


export async function augmentBlock(client: ReadRpcInterface, block: any): Promise<DBBlockBase> {
   return  {
      blockNumber: block.number,
      blockHash: block.hash,
      timestamp: block.unixTimestamp,
      response: JSON.stringify(block.data),
  } as DBBlockBase
}

export async function augmentBlockUtxo(client: ReadRpcInterface, block: UtxoBlock): Promise<DBBlockBase> {
   return  {
      blockNumber: block.number,
      blockHash: block.hash,
      timestamp: block.unixTimestamp,
      response: JSON.stringify(block.data),
  } as DBBlockBase
}

export async function augmentBlockAlgo(client: ReadRpcInterface, block: AlgoBlock): Promise<DBBlockBase> {
   return  {
      blockNumber: block.number,
      blockHash: block.hash,
      timestamp: block.unixTimestamp,
      response: JSON.stringify(block.data),
  } as DBBlockBase
}