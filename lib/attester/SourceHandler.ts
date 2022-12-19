import { SourceId } from "../verification/sources/sources";
import { Attestation, AttestationStatus } from "./Attestation";
import { AttestationRound } from "./AttestationRound";
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


  // Rate limit weight counter
  currentRoundWeight = 0;

  constructor(round: AttestationRound, sourceId: SourceId) {
    this.round = round;
    this.config = this.round.attestationRoundManager.attestationConfigManager.getSourceHandlerConfig(sourceId, round.roundId);
  }

  /**
   * Checks for rate limit by weighted call limitations.
   * All attestations over the rate limit are rejected with attestation status 'overLimit'.
   * @param attestation 
   * @returns true if validations should be performed.
   */
  canProceedWithValidation(attestation: Attestation): boolean {
    if (this.currentRoundWeight >= this.config.maxTotalRoundWeight) {
      attestation.status = AttestationStatus.overLimit;
      return false;
    }

    const typeConfig = this.config.attestationTypes.get(attestation.data.type);

    if (!typeConfig) {
      this.round.logger.error2(`missing source ${attestation.data.sourceId} config for attestation type (${attestation.data.type})`);

      attestation.status = AttestationStatus.error;
      return false;
    }

    this.currentRoundWeight += typeConfig!.weight;

    //attestation.onValidateAttestation(attestation);

    return true;
  }
}
