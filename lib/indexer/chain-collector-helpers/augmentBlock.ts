import { IBlock } from "@flarenetwork/mcc";
import { DBBlockBase } from "../../entity/indexer/dbBlock";
import { prepareString } from "../../utils/utils";
import { Indexer } from "../indexer";

async function augmentBlockBase(indexer: Indexer, block: IBlock): Promise<DBBlockBase> {
  const entity = new indexer.dbBlockClass() as DBBlockBase;
  entity.blockNumber = block.number;
  entity.blockHash = prepareString(block.stdBlockHash, 128);
  entity.timestamp = block.unixTimestamp;
  entity.confirmed = true;
  return entity;  
}

export async function augmentBlock(indexer: Indexer, block: any): Promise<DBBlockBase> {
  return await augmentBlockBase(indexer, block);
}
