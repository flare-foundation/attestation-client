import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../../utils/reflection/reflection";
import { AttestationTypeConfig } from "./AttestationTypeConfig";

/**
 * Class providing parameters for handling the limitations (maxTotalRoundWeight, ...) of a attestation round for a source
 * and supported attestation types.
 */

export class SourceConfig implements IReflection<SourceConfig> {
  /**
   * Source as string (e.g. "BTC", "DOGE", "XRP"). For names see SourceId enum (src/verification/sources.ts).
   */
  source: string;
  /**
   * Maximal weight limit of attestation request calls per round.
   */
  maxTotalRoundWeight: number;
  /**
   * Supported attestation types
   */
  attestationTypes: AttestationTypeConfig[] = [];

  //
  /**
   * Source id. Not intended to be read from the JSON file. Recalculated from `source`
   */
  @optional() sourceId: string = "";
  /**
   * Map of supported attestation types. Not intended to be read from the JSON file. Recalculated from `attestationTypes`
   */
  @optional() attestationTypesMap: Map<string, AttestationTypeConfig>;

  instantiate(): SourceConfig {
    return new SourceConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("attestationTypes", new AttestationTypeConfig());
    return info;
  }

  /**
   * Initializes `attestationTypesMap` and `sourceId`.
   */
  initialize() {
    this.attestationTypesMap = new Map<string, AttestationTypeConfig>();
    if (!this.source || this.source.length === 0) {
      throw new Error(`Unsupported source id '${this.source}'`);
    }
    this.sourceId = this.source;
    this.attestationTypes.forEach((attestationTypeConfig) => {
      this.attestationTypesMap.set(attestationTypeConfig.type, attestationTypeConfig);
    });
  }
}
