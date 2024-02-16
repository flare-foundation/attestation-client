import { Column, Entity, Index, PrimaryColumn } from "typeorm";

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
@Entity({ name: "doge_block" })
export class DBBlockDOGE extends DBBlockBase {}
@Entity({ name: "xrp_block" })
export class DBBlockXRP extends DBBlockBase {}
