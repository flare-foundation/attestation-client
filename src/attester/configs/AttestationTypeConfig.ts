import { AdditionalTypeInfo, IReflection } from "../../utils/reflection/reflection";
import { AttestationType } from "../../verification/generated/attestation-types-enum";

/**
 * Class defining attestation type for a source in global configuration
 */
export class AttestationTypeConfig implements IReflection<AttestationTypeConfig> {
  type: AttestationType;
  // Weight presents the difficulty of validating the attestation depending on the attestation type and source
  weight: number = 0;

  instanciate(): AttestationTypeConfig {
    return new AttestationTypeConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
