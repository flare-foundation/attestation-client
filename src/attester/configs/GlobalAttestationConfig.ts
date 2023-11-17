import { AdditionalTypeInfo, IReflection } from "../../utils/reflection/reflection";

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

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("defaultSetAssignerAddresses", "string");
    return info;
  }

  instantiate(): GlobalAttestationConfig {
    return new GlobalAttestationConfig();
  }
}
