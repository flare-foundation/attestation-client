import { Attestation } from "../Attestation";
import { AttestationStatus } from "../types/AttestationStatus";
import { SourceConfig } from "../configs/SourceConfig";
import { AttLogger } from "../../utils/logging/logger";

export interface EventValidateAttestation {
  (attestation: Attestation): void;
}

/**
 * Handles limitations of attestation request verification for a specific round and on a specific data source
 */
export class SourceLimiter {
  config: SourceConfig;

  logger: AttLogger;

  // Rate limit weight counter
  private currentRoundWeight = 0;

  constructor(config: SourceConfig, logger: AttLogger) {
    this.logger = logger;
    this.config = config;
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

    const typeConfig = this.config.attestationTypesMap.get(attestation.data.type);

    if (!typeConfig) {
      this.logger.error2(`missing source ${attestation.data.sourceId} config for attestation type (${attestation.data.type})`);
      attestation.status = AttestationStatus.failed;
      return false;
    }

    this.currentRoundWeight += typeConfig!.weight;

    return true;
  }
}
