import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../../utils/reflection/reflection";
import { AttestationType } from "../../verification/generated/attestation-types-enum";
import { SourceId } from "../../verification/sources/sources";
import { SourceConfig } from "./SourceConfig";

/**
 * Class providing global attestation configuration for each source and attestation type
 * from the @param startRoundId on.
 * This is the deserialization class for relevant JSON configuration.
 */
export class GlobalAttestationConfig implements IReflection<GlobalAttestationConfig> {
  /**
   * Round id from which the global configuration is valid
   */
  startRoundId: number;
  /**
   * Set of assigner addresses that define the default set addresses.
   * `StateConnector` smart contract contains a mapping between addresses which can be updated
   * by calling function `updateAttestorAddressMapping(address)`.
   * A validator node for each Flare network has a set of 9-predefined assigners. Each
   * such assigner can using the above method define one member of the attestation set.
   */
  defaultSetAssignerAddresses: string[] = [];

  /**
   * Initial subset size for reaching bit-voting consensus. For a default set of 9 it is
   * usually set to 7. This means that first all subsets of size 7 of the set of 9 attestation
   * provider addresses are calculated and the one with maximal confirmed validations in bit voting
   * is used. If all 7-subsets have 0 intersection votes, the process is repeated with 6-subsets and
   * if needed with 5-subsets.
   */
  consensusSubsetSize: number = 1;

  /**
   * Definitions of supported data sources and attestation types, together with
   * rate limit weights.
   */
  sources: SourceConfig[] = [];

  /**
   * Provides a map between data sources and source configurations.
   * NOTE: this one is not read from the JSON configuration but
   */
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

  /**
   * Initializes `sourceMap` mapping.
   * Should be called after the object is deserialized from JSON.
   */
  initialize() {
    for (const sourceConfig of this.sources) {
      sourceConfig.initialize();
      this.sourcesMap.set(sourceConfig.sourceId, sourceConfig);
    }
  }

  /**
   * Returns `true` if source @param sourceId and attestation type @param type are supported in
   * the global configuration.
   * @param sourceId
   * @param type
   * @returns
   */
  public sourceAndTypeSupported(sourceId: SourceId, type: AttestationType): boolean {
    const config = this.sourcesMap.get(sourceId);
    if (!config) return false;
    const typeConfig = config.attestationTypesMap.get(type);
    return !!typeConfig;
  }
}
