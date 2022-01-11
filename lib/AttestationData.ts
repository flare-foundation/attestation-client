import BN from "bn.js";

export enum AttestationType {
  FassetPaymentProof = 1,
  BalanceDecreasingProof = 2,
}

export interface AttestationRequest {
  timestamp?: BN;
  instructions: BN;
  id: string;
  dataAvailabilityProof: string;
  attestationType?: AttestationType;
}

export class AttestationData {
  // event parameters
  type!: AttestationType;
  timeStamp!: BN;
  id!: string;
  dataAvailabilityProof!: string;

  // block parameters
  blockNumber!: BN;
  transactionIndex!: BN;
  signature!: BN;

  // attestation data
  instructions!: BN;

  comparator(obj: AttestationData): number {
    if (this.blockNumber.lt(obj.blockNumber)) return -1;
    if (this.blockNumber.gt(obj.blockNumber)) return 1;

    if (this.transactionIndex.lt(obj.transactionIndex)) return -1;
    if (this.transactionIndex.gt(obj.transactionIndex)) return 1;

    if (this.signature.lt(obj.signature)) return -1;
    if (this.signature.gt(obj.signature)) return 1;

    return 0;
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
