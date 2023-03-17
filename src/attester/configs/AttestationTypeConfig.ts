import { AdditionalTypeInfo, IReflection } from "../../utils/reflection/reflection";

/**
 * Class defining attestation type for a source in global configuration.
 */
export class AttestationTypeConfig implements IReflection<AttestationTypeConfig> {
  /**
   * Type name as string. Se enum `AttestationType` (src/verification/generated/attestation-types-enum.ts)
   */
  type: string;
  /**
   * Weight presents the difficulty of validating the attestation depending on the attestation type and source
   */
  weight: number = 0;

  instantiate(): AttestationTypeConfig {
    return new AttestationTypeConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    return null;
  }
}
