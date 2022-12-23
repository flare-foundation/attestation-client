import { DBBlockBase } from "../../entity/indexer/dbBlock";
import { DBTransactionBase } from "../../entity/indexer/dbTransaction";

export interface onSaveSig {
  (block: DBBlockBase, transactions: DBTransactionBase[]): Promise<boolean>;
}
