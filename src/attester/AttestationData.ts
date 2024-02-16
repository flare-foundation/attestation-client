import { AttestationRequest } from "../../typechain-web3-v1/StateConnector";

import { AttestationDefinitionStore } from "../external-libs/AttestationDefinitionStore";
import { decodeAttestationName } from "../external-libs/utils";

/**
 * Class in which augmented attestation request is read from an emitted attestation request.
 */
export class AttestationData {
  // event parameters
  attestationType: string;
  sourceId: string;
  timeStamp: bigint;
  request: string;

  // block parameters
  blockNumber: bigint;
  logIndex: number;

  constructor(event?: AttestationRequest) {
    if (!event) return;

    this.timeStamp = BigInt(event.returnValues.timestamp);
    this.request = event.returnValues.data;

    // Indicates unparsable request
    this.attestationType = "";
    this.sourceId = "";
    try {
      const prefix = AttestationDefinitionStore.extractPrefixFromRequest(this.request);
      // values are parsed. Note that these may not be valid attestation types
      // in case of parsing problem, exception is thrown
      this.attestationType = decodeAttestationName(prefix.attestationType);
      this.sourceId = decodeAttestationName(prefix.sourceId);
    } catch (e) {
      // Ignore the exception. Empty strings indicate unparsable
      this.attestationType = "";
      this.sourceId = "";
    }

    // for sorting
    this.blockNumber = BigInt(event.blockNumber);
    this.logIndex = event.logIndex;
  }

  getId(): string {
    return this.request.toLowerCase();
  }
}
