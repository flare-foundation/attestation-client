import { AdditionalTypeInfo, IReflection } from "../../../utils/reflection/reflection";

export class VerifierAttestationTypeRouteConfig implements IReflection<VerifierAttestationTypeRouteConfig> {
  public attestationTypes: string[] = [];
  public url: string = "";
  public apiKey: string = "";

  instanciate(): VerifierAttestationTypeRouteConfig {
    return new VerifierAttestationTypeRouteConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("attestationTypes", "string");
    return info;
  }
}
