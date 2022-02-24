import { IAlgoBlockData, ReadRpcInterface } from "flare-mcc";
import { DBBlock } from "../../entity/dbBlock";


export async function augmentBlockDefault(client: ReadRpcInterface, block: any): Promise<DBBlock> {
   return  {
      blockNumber: 0,
      blockHash: "hash",
      timestamp: 0,
      response: "json",
  } as DBBlock
}

export async function augmentBlockAlgo(client: ReadRpcInterface, block: IAlgoBlockData): Promise<DBBlock> {
   return  {
      blockNumber: block.round,
      blockHash: block.genesisId,
      timestamp: 0,
      response: "json",
  } as DBBlock
}