import { BigNumber } from "ethers";

export enum AttestationType {
  Transaction = 1,
  TransactionFull = 2,
}

export class AttestationData {
  // event parameters
  type!: AttestationType;
  timeStamp!: BigNumber;
  id!: string;

  // block parameters
  blockNumber!: BigNumber;
  transactionIndex!: BigNumber;
  signature!: BigNumber;

  // attestation data
  data!: BigNumber;

  comparator(obj: AttestationData): number {
    if (this.blockNumber < obj.blockNumber) return -1;
    if (this.blockNumber > obj.blockNumber) return 1;

    if (this.transactionIndex < obj.transactionIndex) return -1;
    if (this.transactionIndex > obj.transactionIndex) return 1;

    if (this.signature < obj.signature) return -1;
    if (this.signature > obj.signature) return 1;

    return 0;
  }
}
