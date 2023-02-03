import { SourceId } from "../../verification/sources/sources";

export class SourceLimiterTypeConfig {
  // Weight presents the difficulty of validating the attestation depending on the attestation type and source
  weight!: number;
}
/**
 * Class providing parameters for handling the limitations (maxTotalRoundWeight, ...) of a attestation round for a source
 */


export class SourceLimiterConfig {
  source!: SourceId;
  maxTotalRoundWeight!: number;
  attestationTypes = new Map<number, SourceLimiterTypeConfig>();
}
