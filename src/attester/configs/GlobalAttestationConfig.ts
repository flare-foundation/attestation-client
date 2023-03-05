import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../../utils/reflection/reflection";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { SourceConfig } from "./SourceConfig";

export const DAC_REFRESH_TIME_S = 10;
/**
 * Class providing SourceLimiterConfig for each source from the @param startRoundId on.
 * NOTE: If you add any new field, please update function 'load()' accordingly!
 */
export class GlobalAttestationConfig implements IReflection<GlobalAttestationConfig> {
  startRoundId: number;
  defaultSetAssignerAddresses: string[] = [];
  consensusSubsetSize: number = 1;
  sources: SourceConfig[] = [];

  @optional() sourcesMap = new Map<SourceId, SourceConfig>();

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("defaultSetAssignerAddresses", "string");
    info.arrayMap.set("sources", new SourceConfig());
    return info;
  }

  instanciate(): GlobalAttestationConfig {
    return new GlobalAttestationConfig();
  }

  initialize() {
    for (const sourceConfig of this.sources) {
      sourceConfig.initialize();
      this.sourcesMap.set(sourceConfig.sourceId, sourceConfig);
    }
  }

  public sourceAndTypeSupported(sourceId: SourceId, type: AttestationType): boolean {
    const config = this.sourcesMap.get(sourceId);
    if (!config) return false;
    const typeConfig = config.attestationTypesMap.get(type);
    return !!typeConfig;
  }
}
