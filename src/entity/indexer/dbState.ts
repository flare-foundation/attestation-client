import { Column, Entity, PrimaryColumn } from "typeorm";

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
