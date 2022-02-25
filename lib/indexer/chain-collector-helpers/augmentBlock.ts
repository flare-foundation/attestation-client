import { IAlgoBlockData, ReadRpcInterface } from "flare-mcc";
import { DBBlockBase } from "../../entity/dbBlock";


export async function augmentBlockDefault(client: ReadRpcInterface, block: any): Promise<DBBlockBase> {
   return  {
      blockNumber: 0,
      blockHash: "hash",
      timestamp: 0,
      response: "json",
  } as DBBlockBase
}

export async function augmentBlockUtxo(client: ReadRpcInterface, block: any): Promise<DBBlockBase> {
   return  {
      blockNumber: 0,
      blockHash: "hash",
      timestamp: 0,
      response: "json",
  } as DBBlockBase
}

export async function augmentBlockAlgo(client: ReadRpcInterface, block: IAlgoBlockData): Promise<DBBlockBase> {
   return  {
      blockNumber: block.round,
      blockHash: block.genesisId,
      timestamp: 0,
      response: "json",
  } as DBBlockBase
}