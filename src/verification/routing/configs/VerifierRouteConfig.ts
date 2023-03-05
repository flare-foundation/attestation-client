import { AdditionalTypeInfo, IReflection } from "../../../utils/reflection/reflection";
import { getSourceName } from "../../sources/sources";
import { VerifierSourceRouteConfig } from "./VerifierSourceRouteConfig";

export class VerifierRouteConfig implements IReflection<VerifierRouteConfig> {
  public startRoundId: number;
  public verifierRoutes: VerifierSourceRouteConfig[] = [];

  instanciate(): VerifierRouteConfig {
    return new VerifierRouteConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("verifierRoutes", new VerifierSourceRouteConfig());
    return info;
  }

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
