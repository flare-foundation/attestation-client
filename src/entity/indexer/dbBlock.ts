import { Column, Entity, Index, PrimaryColumn } from "typeorm";
import { BlockResult } from "../../indexed-query-manager/indexed-query-manager-types";

/**
 * Format for storing block data in indexer database
 */
export class DBBlockBase {
  @PrimaryColumn({ type: "varchar" })
  blockHash!: string;

  @Column()
  @Index()
  blockNumber!: number;

  @Column()
  @Index()
  timestamp!: number;

  @Column({ nullable: true })
  transactions: number;

  @Column({ nullable: true })
  @Index()
  confirmed: boolean;

  // relevant only if confirmed not true
  @Column({ nullable: true })
  @Index()
  numberOfConfirmations: number;

  @Column({ nullable: true })
  @Index()
  previousBlockHash: string;
}

export type IDBBlockBase = new () => DBBlockBase;

@Entity({ name: "btc_block" })
export class DBBlockBTC extends DBBlockBase {}
@Entity({ name: "ltc_block" })
export class DBBlockLTC extends DBBlockBase {}
@Entity({ name: "doge_block" })
export class DBBlockDOGE extends DBBlockBase {}
@Entity({ name: "xrp_block" })
export class DBBlockXRP extends DBBlockBase {}

@Entity({ name: "algo_block" })
export class DBBlockALGO extends DBBlockBase {}

// External Postgres Database Entities (DOGE) (read only)
@Entity("doge_indexer_dogeblock")
export class DBDogeIndexerBlock {
  @PrimaryColumn({ type: "char" })
  blockHash!: string;

  @Column()
  blockNumber: number;

  @Column()
  timestamp: number;

  @Column()
  transactions: number;

  @Column()
  confirmed: boolean;

  @Column()
  previousBlockHash: string;

  toBlockResult(): BlockResult {
    return {
      blockNumber: this.blockNumber,
      blockHash: this.blockHash,
      timestamp: this.timestamp,
      transactions: this.transactions,
      confirmed: this.confirmed,
    };
  }
}

export type IDEDogeIndexerBlock = new () => DBDogeIndexerBlock;
