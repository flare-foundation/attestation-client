import { AdditionalTypeInfo, IReflection } from "../../../utils/reflection";

export class VerifierAttestationTypeRouteCredentials implements IReflection<VerifierAttestationTypeRouteCredentials> {
  public attestationTypes: string[] = [];
  public url: string = "";
  public apiKey: string = "";

  instanciate(): VerifierAttestationTypeRouteCredentials {
    return new VerifierAttestationTypeRouteCredentials();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("attestationTypes", "string");
    return info;
  }
}
