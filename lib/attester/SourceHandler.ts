import { ChainManager } from "../chain/ChainManager";
import { ChainType } from "../MCC/types";
import { Attestation, AttestationStatus, EventValidate } from "./Attestation";
import { AttestationRound } from "./AttestationRound";
import { AttestationRoundManager } from "./AttestationRoundManager";

export interface EventValidateAttestation {
  (attestation: Attestation): void;
}

export class SourceHandler {
  round: AttestationRound;

  source: number;

  attestations: number = 0;

  limit: number = 10;

  onValidateAttestation: EventValidateAttestation | undefined = undefined;

  constructor(round: AttestationRound, source: number, onValidateAttestation: EventValidateAttestation) {
    this.round = round;
    this.source = source as ChainType;
    this.onValidateAttestation = onValidateAttestation;
  }

  validate(attestation: Attestation) {
    this.attestations++;

    if (this.attestations > this.limit) {
      attestation.status = AttestationStatus.overLimit;
      attestation.onProcessed!(attestation);
      return;
    }

    //AttestationRoundManager.chainManager.validateTransaction(this.source as ChainType, attestation);

    this.onValidateAttestation!(attestation);
  }
}
