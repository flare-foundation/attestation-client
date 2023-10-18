import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "../base/BaseEntity";

@Entity({ name: "state" })
export class DBState {
  @PrimaryColumn({ type: "varchar" })
  name!: string;

  @Column()
  valueString: string = "";

  @Column()
  valueNumber: number = 0;

  @Column()
  timestamp: number = 0;

  @Column({ nullable: true })
  comment: string = "";
}

// External Postgres Database Entities (DOGE) (read only)

export type ITipSyncState = new () => TipSyncState;

@Entity("doge_indexer_tipsyncstate")
export class TipSyncState {
  @PrimaryColumn({ type: "bigint" })
  id: string;

  @Column()
  syncState: string;

  @Column()
  latestTipHeight: number;

  @Column()
  latestIndexedHeight: number;

  @Column()
  timestamp: number;
}