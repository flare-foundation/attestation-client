import BN from "bn.js";
import { toBN } from "web3-utils";
import { AttestationRequest } from "../../typechain-web3-v1/StateConnector";

import { getAttestationTypeAndSource } from "../verification/attestation-types/attestation-type-utils";
import { AttestationType } from "../verification/generated/attestation-types-enum";
import { SourceId } from "../verification/sources/sources";

/**
 * Class in which augmented attestation request is read from an emitted attestation request.
 */
export class AttestationData {
  // event parameters
  type: AttestationType;
  sourceId: SourceId;
  timeStamp: BN;
  request: string;

  // block parameters
  blockNumber: BN;
  logIndex: number;

  constructor(event?: AttestationRequest) {
    if (!event) return;

    this.timeStamp = toBN(event.returnValues.timestamp);
    this.request = event.returnValues.data;

    // if error at parsing, exception is thrown
    const { attestationType, sourceId } = getAttestationTypeAndSource(this.request);

    // values are parsed. Note that these may not be valid attestation types
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
