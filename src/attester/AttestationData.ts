import BN from "bn.js";
import { toBN } from "web3-utils";
import { AttestationRequest } from "../../typechain-web3-v1/StateConnector";

import { AttestationDefinitionStore } from "../external-libs/AttestationDefinitionStore";
import { decodeAttestationName } from "../external-libs/utils";

/**
 * Class in which augmented attestation request is read from an emitted attestation request.
 */
export class AttestationData {
  // event parameters
  type: string;
  sourceId: string;
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
    const { attestationType, sourceId } = AttestationDefinitionStore.extractPrefixFromRequest(this.request);


    // values are parsed. Note that these may not be valid attestation types
    // in case of parsing problem, exception is thrown
    this.type = decodeAttestationName(attestationType);
    this.sourceId = decodeAttestationName(sourceId);

    // for sorting
    this.blockNumber = toBN(event.blockNumber);
    this.logIndex = event.logIndex;
  }

  getId(): string {
    return this.request;
  }
}
