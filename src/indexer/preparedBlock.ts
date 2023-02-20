import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DBTransactionBase } from "../entity/indexer/dbTransaction";

/**
 * Record for prepared blocks.
 */
export class PreparedBlock {
  block: DBBlockBase;
  transactions: DBTransactionBase[];

  constructor(block: DBBlockBase, transactions: DBTransactionBase[]) {
    this.block = block;
    this.transactions = transactions;
  }
}
