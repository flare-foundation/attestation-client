import { Column, Entity, Index, PrimaryColumn } from "typeorm";

/**
 * Format for storing the data from a resolved attestation round
 */
@Entity({ name: "round_result" })
export class DBRoundResult {
  //extends BaseEntity {
  @PrimaryColumn() roundId: number = 0;
  @Column({ nullable: true }) @Index() merkleRoot: string;
  @Column({ nullable: true }) @Index() maskedMerkleRoot: string;
  @Column({ nullable: true }) @Index() random: string;
  @Column({ nullable: true }) @Index() hashedRandom: string;
  @Column({ nullable: true }) @Index() commitHash: string;
  @Column({ nullable: true }) finalizedTimestamp: number;

  @Column({ nullable: true }) commitTransactionId: string;
  @Column({ nullable: true }) commitNounce: number;
  @Column({ nullable: true }) commitTimestamp: number;

  @Column({ nullable: true }) revealTransactionId: string;
  @Column({ nullable: true }) revealNounce: number;
  @Column({ nullable: true }) revealTimestamp: number;
  @Column({ nullable: true }) transactionCount: number;
  @Column({ nullable: true }) validTransactionCount: number;
}
