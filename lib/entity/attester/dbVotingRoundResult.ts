import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../base/BaseEntity";

/**
 * Format for storing verification data of an attestation
 */
@Entity({ name: "voting_round_result" })
export class DBVotingRoundResult extends BaseEntity {
  @Column() @Index() roundId: number = 0;
  @Column() @Index() hash: string = "";
  @Column({ type: "text" }) request: string = "";
  @Column({ type: "text" }) response: string = "";
}
