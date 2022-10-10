import { SourceId } from "../verification/sources/sources";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationRound } from "./AttestationRound";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { SourceHandlerConfig } from "./DynamicAttestationConfig";

//How is it provided?
export interface EventValidateAttestation {
  (attestation: Attestation): void;
}

export class SourceHandler {
  config: SourceHandlerConfig;

  round: AttestationRound;

  onValidateAttestation: EventValidateAttestation;

  attestationCalls = 0;

  constructor(round: AttestationRound, sourceId: SourceId, onValidateAttestation: EventValidateAttestation) {
    this.round = round;
    this.config = AttestationRoundManager.attestationConfigManager.getSourceHandlerConfig(sourceId, round.roundId);

    this.onValidateAttestation = onValidateAttestation;
  }

  validate(attestation: Attestation) {
    if (this.attestationCalls >= this.config.maxTotalRoundWeight) {
      attestation.status = AttestationStatus.overLimit;
      attestation.onProcessed!(attestation);
      return;
    }

    const typeConfig = this.config.attestationTypes.get(attestation.data.type);

    if (!typeConfig) {
      this.round.logger.error2(`missing source ${attestation.data.sourceId} config for attestation type (${attestation.data.type})`);

      attestation.status = AttestationStatus.error;
      attestation.onProcessed!(attestation);
      return;
    }

    this.attestationCalls += typeConfig!.weight;

    this.onValidateAttestation!(attestation);
  }
}
