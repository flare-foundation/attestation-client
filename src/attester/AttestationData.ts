import { toBN } from "@flarenetwork/mcc";
import BN from "bn.js";
import { getAttestationTypeAndSource } from "../verification/generated/attestation-request-parse";
import { AttestationType } from "../verification/generated/attestation-types-enum";
import { SourceId } from "../verification/sources/sources";

/**
 * Class in which augmented attestation request is read from an emitted attestation request.
 */
export class AttestationData {
  // event parameters
  type!: AttestationType;
  sourceId!: SourceId;
  timeStamp!: BN;
  request!: string;

  // block parameters
  blockNumber!: BN;
  logIndex!: number;

  constructor(event?: any) {
    if (!event) return;

    this.timeStamp = toBN(event.returnValues.timestamp);
    this.request = event.returnValues.data;

    const { attestationType, sourceId } = getAttestationTypeAndSource(this.request);

    // if parsing is not successful, null is set for both values
    this.type = attestationType;
    this.sourceId = sourceId;

    // for sorting
    this.blockNumber = toBN(event.blockNumber);
    this.logIndex = event.logIndex;
  }

  getId(): string {
    return this.request;
  }
}

/**
 * Choose Round data event emitted by attestation providers when they coos which requests can be attested to
 */
export class BitVoteData {
  sender: string;
  timestamp: number;
  data: string;

  constructor(event?: any) {
    if (!event) return; 
    this.sender = event.returnValues.sender;
    this.timestamp = parseInt(event.returnValues.timestamp, 10);
    this.data = event.returnValues.data;
  }

  roundCheck(roundId: number): boolean {
    if(!this.data || this.data.length < 4) return false;
    return parseInt(this.data.slice(0, 4), 16) === roundId % 256;
  }

  get bitVote(): string {
    if(!this.data || this.data.length < 4) return "0x00";
    return '0x' + this.data.slice(4);
  }
}

