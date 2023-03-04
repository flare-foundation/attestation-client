import { optional } from "@flarenetwork/mcc";
import { option } from "yargs";
import { AdditionalTypeInfo, IReflection } from "../../utils/reflection/reflection";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId, toSourceId } from "../../verification/sources/sources";
import { AttestationTypeConfig } from "./AttestationTypeConfig";

/**
 * Class providing parameters for handling the limitations (maxTotalRoundWeight, ...) of a attestation round for a source
 */

export class SourceConfig implements IReflection<SourceConfig> {
  source: string;
  maxTotalRoundWeight: number;
  attestationTypes: AttestationTypeConfig[] = [];
  // Not intended to be read from the JSON file. Recalculated from `attestationTypes`
  @optional() sourceId: SourceId;
  @optional() attestationTypesMap = new Map<AttestationType, AttestationTypeConfig>();

  instanciate(): SourceConfig {
    return new SourceConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("attestationTypes", new AttestationTypeConfig());
    return info;
  }

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
