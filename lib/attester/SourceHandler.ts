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

  onValidateAttestation: EventValidateAttestation | undefined = undefined;

  constructor(round: AttestationRound, id: number, onValidateAttestation: EventValidateAttestation) {
    this.round = round;
    this.config = AttestationRoundManager.attestationConfigManager.getSourceHandlerConfig(id, round.epochId);
    this.onValidateAttestation = onValidateAttestation;
  }

  validate(attestation: Attestation) {
    if (this.round.attestationCalls >= this.config.maxCallsPerRound) {
      attestation.status = AttestationStatus.overLimit;
      attestation.onProcessed!(attestation);
      return;
    }

    this.round.attestationCalls += this.config.avgCalls;

    this.onValidateAttestation!(attestation);
  }
}
