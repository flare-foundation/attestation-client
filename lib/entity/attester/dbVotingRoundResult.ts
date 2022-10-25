import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../base/BaseEntity";

@Entity({ name: "voting_round_result" })
export class DBVotingRoundResult extends BaseEntity {
  @Column() @Index() roundId = 0;
  @Column() @Index() hash = "";
  @Column({ type: "text" }) request = "";
  @Column({ type: "text" }) response = "";
}
