import { SourceId } from "../verification/sources/sources";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationRound } from "./AttestationRound";
import { AttestationRoundManager } from "./AttestationRoundManager";
import { SourceHandlerConfig } from "./DynamicAttestationConfig";

export interface EventValidateAttestation {
  (attestation: Attestation): void;
}

/**
 * Handles validation of attestation request for a specific round and on a specific data source
 */
export class SourceHandler {
  config: SourceHandlerConfig;

  round: AttestationRound;

  // A callback for the actual validation
  onValidateAttestation: EventValidateAttestation;

  // Rate limit weight counter
  currentRoundWeight = 0;

  constructor(round: AttestationRound, sourceId: SourceId, onValidateAttestation: EventValidateAttestation) {
    this.round = round;
    this.config = AttestationRoundManager.attestationConfigManager.getSourceHandlerConfig(sourceId, round.roundId);
    this.onValidateAttestation = onValidateAttestation;
  }

  /**
   * Triggers validation of the attestation. Checks for rate limit by weighted call limitations.
   * All attestations over the rate limit are rejected with attestation status 'overLimit'.
   * The actual validation of non-rate limited attestation requests is carried out by triggering
   * onValidateAttestation callback
   * @param attestation 
   * @returns 
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

    this.onValidateAttestation!(attestation);
  }
}
