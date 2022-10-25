import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../base/BaseEntity";

@Entity({ name: "attestation_request" })
export class DBAttestationRequest extends BaseEntity {
  @Column() @Index() roundId = 0;
  @Column() @Index() blockNumber = "";
  @Column() @Index() logIndex = 0;

  @Column({ type: "text" }) requestBytes = "";
  @Column({ type: "text" }) request = "";
  @Column() verificationStatus = "";
  // nullable due to migration
  @Column({nullable: true}) attestationStatus: string;
  @Column({ type: "text" }) response = "";
  @Column() exceptionError = "";
  @Column() hashData = "";
}
