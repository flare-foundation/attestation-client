import BN from "bn.js";
import { ChainType, toBN } from "flare-mcc";
import { getAttestationTypeAndSource } from "../verification/attestation-types/attestation-types-helpers";
import { AttestationType } from "../verification/generated/attestation-types-enum";

export class AttestationData {
  // event parameters
  type!: AttestationType;
  chainType!: ChainType;
  timeStamp!: BN;
  request!: string;
  
  // block parameters
  blockNumber!: BN;
  logIndex!: number;

  // attestation data
  instructions!: BN;

  constructor(event: any) {

    if( !event ) return;

    this.timeStamp = toBN(event.returnValues.timestamp);
    this.request = event.returnValues.data;
    
    const {attestationType, sourceId} = getAttestationTypeAndSource(this.request);
    this.type = attestationType;
    this.chainType = sourceId;

    // for sorting
    this.blockNumber = toBN(event.blockNumber);
    this.logIndex = event.logIndex;
  }
  
  comparator(obj: AttestationData): number {
    if (this.blockNumber.lt(obj.blockNumber)) return -1;
    if (this.blockNumber.gt(obj.blockNumber)) return 1;

    if (this.logIndex < obj.logIndex) return -1;
    if (this.logIndex > obj.logIndex) return 1;

    return 0;
  }

  getHash(): string {
    return this.request;
  }

}
