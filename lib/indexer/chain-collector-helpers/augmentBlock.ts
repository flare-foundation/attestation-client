import { RPCInterface } from "flare-mcc";
import { DBBlock } from "../../entity/dbBlock";


export async function augmentBlockDefault(client: RPCInterface, block: any): Promise<DBBlock> {
   return  {
      blockNumber: 0,
      blockHash: "hash",
      timestamp: 0,
      response: "json",
  } as DBBlock
}