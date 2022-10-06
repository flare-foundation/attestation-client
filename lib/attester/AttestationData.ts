import { toBN } from "@flarenetwork/mcc";
import BN from "bn.js";
import { getAttestationTypeAndSource } from "../verification/generated/attestation-request-parse";
import { AttestationType } from "../verification/generated/attestation-types-enum";
import { SourceId } from "../verification/sources/sources";

/**
 * Class in which augmentated attestation request is read from an emited attestation request.
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

  getHash(): string {
    return this.request;
  }
}
