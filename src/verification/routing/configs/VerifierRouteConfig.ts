import { AdditionalTypeInfo, IReflection } from "../../../utils/reflection/reflection";
import { getSourceName } from "../../sources/sources";
import { VerifierSourceRouteConfig } from "./VerifierSourceRouteConfig";

/**
 * Deserialization class for JSON configuration for verifier routes.
 */
export class VerifierRouteConfig implements IReflection<VerifierRouteConfig> {
  /**
   * Round id from which the verifier route config is valid (including).
   * The configuration is valid until one less then `startRoundId` in the next configuration
   * for bigger start round id.
   */
  public startRoundId: number;

  /**
   * List of verifier route configurations per source
   */
  public verifierRoutes: VerifierSourceRouteConfig[] = [];

  instantiate(): VerifierRouteConfig {
    return new VerifierRouteConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("verifierRoutes", new VerifierSourceRouteConfig());
    return info;
  }

  /**
   * Returns source configuration for given @param sourceId
   * @param sourceId
   * @returns
   */
  getSourceConfig(sourceId: number): VerifierSourceRouteConfig | undefined {
    const sourceName = getSourceName(sourceId);
    for (let config of this.verifierRoutes) {
      if (config.sourceId === sourceName) {
        return config;
      }
    }
    return;
  }
}

// Example:
// {
//    startRoundId: 1,
//    verifierRoutes: [
//       {
//          sourceId: "XRP",
//          defaultUrl: "https://sdfsdfsd",
//          defaultApiKey: "asdfasdf",
//          routes: [
//             {
//                attestationTypes: ["Payment", "BalanceDecreasingTransaction"],
//                url: "https://sdfasdfa",
//                apiKey: "asdfasdf"
//             }
//             ...
//          ]
//       }
//       ...
//   ]
// }
