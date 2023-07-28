import { BlockBase } from "@flarenetwork/mcc";
import { DBBlockBase, IDBBlockBase } from "../../entity/indexer/dbBlock";
import { prepareString } from "../../utils/helpers/utils";

/**
 * Creates database entity for a confirmed block
 * @param dbBlockClass
 * @param block
 * @returns
 */
export function augmentBlock(dbBlockClass: IDBBlockBase, block: BlockBase): DBBlockBase {
  const entity = new dbBlockClass();
  entity.blockNumber = block.number;
  entity.blockHash = prepareString(block.stdBlockHash, 128);
  entity.timestamp = block.unixTimestamp;
  entity.confirmed = true;
  entity.transactions = block.transactionCount;
  entity.previousBlockHash = block.previousBlockHash;

  return entity;
}
