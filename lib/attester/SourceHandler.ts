import { SourceId } from "../verification/sources/sources";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationRound } from "./AttestationRound";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { SourceHandlerConfig } from "./DynamicAttestationConfig";

/**
 * ??A protocol for providing verificationData to an attestation??
 */
export interface EventValidateAttestation {
  (attestation: Attestation): void;
}

/**
 * A Class
 */
export class SourceHandler {
  config: SourceHandlerConfig;

  round: AttestationRound;

  onValidateAttestation: EventValidateAttestation;

  currentRoundWeight = 0;

  constructor(round: AttestationRound, sourceId: SourceId, onValidateAttestation: EventValidateAttestation) {
    this.round = round;
    this.config = AttestationRoundManager.attestationConfigManager.getSourceHandlerConfig(sourceId, round.roundId);

    this.onValidateAttestation = onValidateAttestation;
  }

  /**
   * If the maxTotalRoundWeight is not reached, adds the weight of the attestation to the currentRoundWeight and puts the attestation to be validated.
   */
  validate(attestation: Attestation) {
    if (this.currentRoundWeight >= this.config.maxTotalRoundWeight) {
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

    this.currentRoundWeight += typeConfig!.weight;

    this.onValidateAttestation!(attestation); //Hard to find where this is set!!! This is set in createAttestation from AttestationRoundManager
  }
}
