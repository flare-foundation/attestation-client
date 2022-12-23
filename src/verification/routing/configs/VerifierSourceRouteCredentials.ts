import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../../../utils/reflection";
import { VerifierAttestationTypeRouteCredentials } from "./VerifierAttestationTypeRouteCredentials";

export class VerifierSourceRouteCredentials implements IReflection<VerifierSourceRouteCredentials> {
  public sourceId: string = "";
  @optional() public defaultUrl: string = "";
  @optional() public defaultApiKey: string = "";

  @optional() public maxRequestsPerSecond: number = 80;
  @optional() public maxProcessingTransactions: number = 3000;
  @optional() public maxFailedRetry: number = 1;
  @optional() public delayBeforeRetry: number = 10;
  @optional() public reverificationTimeOffset: number = 10;         

  public routes: VerifierAttestationTypeRouteCredentials[] = [];

  instanciate(): VerifierSourceRouteCredentials {
    return new VerifierSourceRouteCredentials();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("routes", new VerifierAttestationTypeRouteCredentials());
    return info;
  }
}
