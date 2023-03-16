import { Column, Entity, Index, PrimaryColumn } from "typeorm";

/**
 * Format for storing the data from a resolved attestation round
 */
@Entity({ name: "round_result" })
export class DBRoundResult {
  // extends BaseEntity {
  @PrimaryColumn() roundId: number = 0;
  @Column({ nullable: true }) @Index() merkleRoot: string;
  @Column({ nullable: true }) @Index() maskedMerkleRoot: string;
  @Column({ nullable: true }) @Index() random: string;
  @Column({ nullable: true }) finalizedTimestamp: number;

  @Column({ nullable: true }) commitTransactionId: string;
  @Column({ nullable: true }) commitNonce: number;
  @Column({ nullable: true }) commitTimestamp: number;

  @Column({ nullable: true }) revealTransactionId: string;
  @Column({ nullable: true }) revealNonce: number;
  @Column({ nullable: true }) revealTimestamp: number;
  @Column({ nullable: true }) transactionCount: number;
  @Column({ nullable: true }) validTransactionCount: number;

  @Column({ nullable: true, type: "text" }) bitVote: string;
  @Column({ nullable: true }) bitVoteTransactionId: string;
  @Column({ nullable: true }) bitVoteNonce: number;
  @Column({ nullable: true }) bitVoteTimestamp: number;

  @Column({ nullable: true, type: "text" }) bitVoteResult: string;
  @Column({ nullable: true }) bitVoteResultTimestamp: number;

  // This field is either empty or contains protest string
  @Column({ nullable: true }) protest: string;
}
