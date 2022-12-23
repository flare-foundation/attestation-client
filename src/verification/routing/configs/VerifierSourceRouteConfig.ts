import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../../../utils/reflection";
import { VerifierAttestationTypeRouteConfig } from "./VerifierAttestationTypeRouteConfig";

export class VerifierSourceRouteConfig implements IReflection<VerifierSourceRouteConfig> {
  public sourceId: string = "";
  @optional() public defaultUrl: string = "";
  @optional() public defaultApiKey: string = "";

  @optional() public maxRequestsPerSecond: number = 80;
  @optional() public maxProcessingTransactions: number = 3000;
  @optional() public maxFailedRetry: number = 1;
  @optional() public delayBeforeRetry: number = 10;
  @optional() public reverificationTimeOffset: number = 10;         

  public routes: VerifierAttestationTypeRouteConfig[] = [];

  instanciate(): VerifierSourceRouteConfig {
    return new VerifierSourceRouteConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("routes", new VerifierAttestationTypeRouteConfig());
    return info;
  }
}
