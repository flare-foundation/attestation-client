import { IBlock } from "@flarenetwork/mcc";
import { DBBlockBase } from "../../entity/indexer/dbBlock";
import { prepareString } from "../../utils/utils";
import { Indexer } from "../indexer";

/**
 * Creates database entity for a confirmed block while indexing.
 * @param indexer indexer object
 * @param block block as returned by MCC
 * @returns Block Database entity
 * @category
 */
export async function augmentBlock(indexer: Indexer, block: IBlock): Promise<DBBlockBase> {
  const entity = new indexer.dbBlockClass() as DBBlockBase;
  entity.blockNumber = block.number;
  entity.blockHash = prepareString(block.stdBlockHash, 128);
  entity.timestamp = block.unixTimestamp;
  entity.confirmed = true;
  return entity;  
}

