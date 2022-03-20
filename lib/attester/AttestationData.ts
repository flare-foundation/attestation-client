import BN from "bn.js";
import { ChainType, toBN } from "flare-mcc";
import { getAttestationTypeAndSource } from "../verification/generated/attestation-request-parse";
import { AttestationType } from "../verification/generated/attestation-types-enum";

export class AttestationData {
  // event parameters
  type!: AttestationType;
  chainType!: ChainType;  // TODO: change this to SourceId
  timeStamp!: BN;
  request!: string;
  
  // block parameters
  blockNumber!: BN;
  logIndex!: number;

  // attestation data
  // instructions!: BN;  // obsolete

  constructor(event?: any) {

    if( !event ) return;

    this.timeStamp = toBN(event.returnValues.timestamp);
    this.request = event.returnValues.data;
    
    const {attestationType, sourceId} = getAttestationTypeAndSource(this.request);
    
    // If parsing is not successful, null is set for both values
    this.type = attestationType;
    this.chainType = sourceId as any as ChainType;

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
