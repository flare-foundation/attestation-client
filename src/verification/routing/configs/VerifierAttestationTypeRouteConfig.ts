import { AdditionalTypeInfo, IReflection } from "../../../utils/reflection/reflection";
/**
 * Configuration for verifier routes for a specific attestation type
 */
export class VerifierAttestationTypeRouteConfig implements IReflection<VerifierAttestationTypeRouteConfig> {
  /**
   * A list of attestation types indicated by their names. Names in type definition files in folder
   * `src/verification/attestation-types`
   * should be used.
   */
  public attestationTypes: string[] = [];
  /**
   * URL for the verifier server to serve the attestation type
   */
  public url: string = "";
  /**
   * API key for the verifier server.
   */
  public apiKey: string = "";

  instantiate(): VerifierAttestationTypeRouteConfig {
    return new VerifierAttestationTypeRouteConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("attestationTypes", "string");
    return info;
  }
}
