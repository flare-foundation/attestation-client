import { IBlock } from "@flarenetwork/mcc";
import { DBBlockBase } from "../../entity/indexer/dbBlock";

async function augmentBlockBase(block: IBlock): Promise<DBBlockBase> {
  return {
    blockNumber: block.number,
    blockHash: block.stdBlockHash,
    timestamp: block.unixTimestamp,
    confirmed: true,
  } as DBBlockBase;
}

export async function augmentBlock(block: any): Promise<DBBlockBase> {
  return await augmentBlockBase(block);
}
