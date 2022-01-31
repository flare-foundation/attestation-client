import { ChainType } from "flare-mcc";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationRound } from "./AttestationRound";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { SourceHandlerConfig } from "./DynamicAttestationConfig";

export interface EventValidateAttestation {
  (attestation: Attestation): void;
}

export class SourceHandler {
  config: SourceHandlerConfig;

  round: AttestationRound;

  source: number;

  attestations: number = 0;

  onValidateAttestation: EventValidateAttestation | undefined = undefined;

  constructor(round: AttestationRound, source: number, onValidateAttestation: EventValidateAttestation) {
    this.round = round;
    this.config = AttestationRoundManager.attestationConfigManager.getSourceHandlerConfig(source, round.epochId);

    //AttestationRoundManager.logger

    this.source = source as ChainType;
    this.onValidateAttestation = onValidateAttestation;
  }

  validate(attestation: Attestation) {
    this.attestations++;

    if (this.attestations > this.config.attestationLimitNormal) {
      attestation.status = AttestationStatus.overLimit;
      attestation.onProcessed!(attestation);
      return;
    }

    this.onValidateAttestation!(attestation);
  }
}
