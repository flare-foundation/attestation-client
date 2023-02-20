import { AdditionalTypeInfo, IReflection } from "../../../utils/reflection/reflection";
import { getSourceName } from "../../sources/sources";
import { VerifierSourceRouteConfig } from "./VerifierSourceRouteConfig";

export class VerifierRouteConfig implements IReflection<VerifierRouteConfig> {
  public verifierRoutes: VerifierSourceRouteConfig[] = [];

  instanciate(): VerifierRouteConfig {
    return new VerifierRouteConfig();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("verifierRoutes", new VerifierSourceRouteConfig());
    return info;
  }
}

export function getSourceConfig(verifierRouteConfig: VerifierRouteConfig, sourceId: number) {
  const sourceName = getSourceName(sourceId);
  for (let config of verifierRouteConfig.verifierRoutes) {
    if (config.sourceId === sourceName) {
      return config;
    }
  }
  return null;
}

// {
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