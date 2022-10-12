import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../base/BaseEntity";

/**
 * Format for storing data of a resolved attestation
 */
@Entity({ name: "attestation_request" })
export class DBAttestationRequest extends BaseEntity {
  @Column() @Index() roundId: number = 0;
  @Column() @Index() blockNumber: string = "";
  @Column() @Index() logIndex: number = 0;

  @Column({ type: "text" }) requestBytes: string = "";
  @Column({ type: "text" }) request: string = "";
  @Column() verificationStatus: string = "";
  // nullable due to migration
  @Column({ nullable: true }) attestationStatus: string;
  @Column({ type: "text" }) response: string = "";
  @Column() exceptionError: string = "";
  @Column() hashData: string = "";
}
