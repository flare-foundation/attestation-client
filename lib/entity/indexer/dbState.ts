import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { BaseEntity } from "../base/BaseEntity";

@Entity({ name: "state" })
export class DBState {
  @PrimaryColumn({ type: "varchar" })
  name!: string;

  @Column()
  valueString = "";

  @Column()
  valueNumber = 0;

  @Column()
  timestamp = 0;

  @Column({ nullable: true })
  comment = "";
}
