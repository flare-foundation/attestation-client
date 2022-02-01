import BN from "bn.js";
import { Hash } from "../utils/Hash";
import { AttestationRequest, AttestationType } from "../verification/attestation-types";

export class AttestationData {
  // event parameters
  type!: AttestationType;
  source!: number;
  timeStamp!: BN;
  id!: string;
  dataAvailabilityProof!: string;

  // block parameters
  blockNumber!: BN;
  logIndex!: number;

  // attestation data
  instructions!: BN;

  comparator(obj: AttestationData): number {
    if (this.blockNumber.lt(obj.blockNumber)) return -1;
    if (this.blockNumber.gt(obj.blockNumber)) return 1;

    if (this.logIndex < obj.logIndex) return -1;
    if (this.logIndex > obj.logIndex) return 1;

    return 0;
  }

  getTypeSource(): number {
    return ((this.type as number) << 16) + this.source;
  }

  getHash(): string {
    return Hash.create(this.instructions.toString() + this.id + this.dataAvailabilityProof);
  }

  getAttestationRequest(): AttestationRequest {
    let request: AttestationRequest = {
      timestamp: this.timeStamp,
      instructions: this.instructions,
      id: this.id,
      dataAvailabilityProof: this.dataAvailabilityProof,
      attestationType: this.type,
    };

    return request;
  }
}
