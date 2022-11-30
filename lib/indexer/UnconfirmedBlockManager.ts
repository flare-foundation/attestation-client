import { Managed } from "@flarenetwork/mcc";
import { DBBlockBase } from "../entity/indexer/dbBlock";
import { DatabaseService } from "../utils/databaseService";

/**
 * Manages counting of confirmations on unconfirmed blocks on the top of the chain as 
 * new blocks arrive.
 */
@Managed()
export class UnconfirmedBlockManager {
  blockHashToEntity: Map<string, DBBlockBase>;
  changed: Set<string>;
  dbService: DatabaseService;
  indexerN: number;
  blockTable: any;


  constructor(dbService: DatabaseService, blockTable: any, indexerN: number) {
    this.dbService = dbService;
    this.indexerN = indexerN;
    this.blockTable = blockTable;
    this.changed = new Set<string>();
    this.blockHashToEntity = new Map<string, DBBlockBase>();
  }

  /**
   * Reads all unconfirmed blocks above the confirmation height and initializes the manager.
   */
  async initialize() {
    const query = this.dbService.connection.manager
      .createQueryBuilder(this.blockTable, "block")
      .where("block.blockNumber > :N", { N: this.indexerN });
    const result = await query.getMany() as DBBlockBase[];
    for (const entity of result) {
      this.blockHashToEntity.set(entity.blockHash, entity);
    }
  }

  /**
   * Processes the new block (header) and adjusts the number of confirmations on 
   * unconfirmed blocks above confirmed height.
   * @param block new block
   * @returns 
   */
  addNewBlock(block: DBBlockBase) {
    if (this.blockHashToEntity.get(block.blockHash)) {
      return;
    }
    this.blockHashToEntity.set(block.blockHash, block);
    this.changed.add(block.blockHash);
    // update parents
    let current = block;
    while (true) {
      current = this.blockHashToEntity.get(current.previousBlockHash);
      if (!current) {
        break;
      }
      current.numberOfConfirmations++;
      this.changed.add(current.blockHash);
    }
  }

  /**
   * Returns unconfirmed blocks above confirmation height that were updated and 
   * need to be saved into the database.
   * @returns changed bloks
   */
  getChangedBlocks(): DBBlockBase[] {
    return [...this.changed].map(hash => this.blockHashToEntity.get(hash));
  }
}
