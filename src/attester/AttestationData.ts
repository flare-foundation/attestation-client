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
export class AttestationSubmit {
  // event parameters
  sender: string;
  bufferNumber: BN;
  commitHash: string;
  merkleRoot: string;
  randomNumber: string;
  data: string;

  // processed data (bytes)

  // TODO add data from typechain (depending on how we read the blocks)
  constructor(event?: any) {
    if (!event) return;

    this.bufferNumber = toBN(event.returnValues.bufferNumber);
    this.sender = event.returnValues.sender;
    this.data = event.returnValues.data;
    this.commitHash = event.returnValues.commitHash;
    this.merkleRoot = event.returnValues.merkleRoot;
    this.randomNumber = event.returnValues.randomNumber;
  }
}
