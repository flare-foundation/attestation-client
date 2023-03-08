import { optional } from "@flarenetwork/mcc";
import { AdditionalTypeInfo, IReflection } from "../../../utils/reflection/reflection";
import { VerifierAttestationTypeRouteConfig } from "./VerifierAttestationTypeRouteConfig";

/**
 * Configuration class for verifier routing configurations for a given source.
 */
export class VerifierSourceRouteConfig implements IReflection<VerifierSourceRouteConfig> {
  /**
   * Source id defined by string name. Use the names in `src/verification/sources/sources.ts`
   */
  public sourceId: string = "";
  /**
   * Default URL of a verifier server. Overridden in `VerifierAttestationTypeRouteConfig`s if specified.
   */
  @optional() public defaultUrl: string = "";
  /**
   * Default API key of a verifier server. Overridden in `VerifierAttestationTypeRouteConfig`s if specified.
   */  
  @optional() public defaultApiKey: string = "";
  /**
   * Maximum requests per source (used in `SourceManager`)
   */
  @optional() public maxRequestsPerSecond: number = 80;
  /**
   * Maximum transactions that can be in processing per source (used in `SourceManager`)
   */
  @optional() public maxProcessingTransactions: number = 3000;
  /**
   * Maximum number of failed retries before terminating the attestation client (used in `SourceManager`)
   */
  @optional() public maxFailedRetries: number = 1;
  /**
   * Delay before retry after failing (used in `SourceManager`)
   */
  @optional() public delayBeforeRetryMs: number = 1000;

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
