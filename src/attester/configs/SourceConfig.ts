import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../../utils/reflection/reflection";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId, toSourceId } from "../../verification/sources/sources";
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
  @optional() sourceId: SourceId;
  /**
   * Map of supported attestation types. Not intended to be read from the JSON file. Recalculated from `attestationTypes`
   */
  @optional() attestationTypesMap = new Map<AttestationType, AttestationTypeConfig>();

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
    this.attestationTypesMap.clear();
    this.sourceId = toSourceId(this.source);
    if (this.sourceId === SourceId.invalid) {
      throw new Error(`Unsupported source id '${this.source}'`);
    }
    this.attestationTypes.forEach((attestationTypeConfig) => {
      const type = (AttestationType as any)[attestationTypeConfig.type] as AttestationType;
      if (type === undefined) {
        throw new Error(`Unsupported attestation type: '${attestationTypeConfig.type}' for source '${this.source}'`);
      }
      this.attestationTypesMap.set(type, attestationTypeConfig);
    });
  }
}
