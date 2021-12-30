import BN from "bn.js";

export enum AttestationType {
  Transaction = 1,
  FassetPaymentProof = 2,
}

export class AttestationData {
  // event parameters
  type!: AttestationType;
  timeStamp!: BN;
  id!: string;

  // block parameters
  blockNumber!: BN;
  transactionIndex!: BN;
  signature!: BN;

  // attestation data
  data!: BN;

  comparator(obj: AttestationData): number {
    if (this.blockNumber.lt(obj.blockNumber)) return -1;
    if (this.blockNumber.gt(obj.blockNumber)) return 1;

    if (this.transactionIndex.lt(obj.transactionIndex)) return -1;
    if (this.transactionIndex.gt(obj.transactionIndex)) return 1;

    if (this.signature.lt(obj.signature)) return -1;
    if (this.signature.gt(obj.signature)) return 1;

    // if (this.blockNumber < obj.blockNumber) return -1;
    // if (this.blockNumber > obj.blockNumber) return 1;

    // if (this.transactionIndex < obj.transactionIndex) return -1;
    // if (this.transactionIndex > obj.transactionIndex) return 1;

    // if (this.signature < obj.signature) return -1;
    // if (this.signature > obj.signature) return 1;

    return 0;
  }
}
