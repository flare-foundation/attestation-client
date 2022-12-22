import { AdditionalTypeInfo, IReflection } from "../../../utils/reflection";
import { getSourceName } from "../../sources/sources";
import { VerifierSourceRouteCredentials } from "./VerifierSourceRouteCredentials";

export class VerifierRouteCredentials implements IReflection<VerifierRouteCredentials> {
  public verifierRoutes: VerifierSourceRouteCredentials[] = [];

  instanciate(): VerifierRouteCredentials {
    return new VerifierRouteCredentials();
  }

  getAdditionalTypeInfo(obj: any): AdditionalTypeInfo {
    const info = new AdditionalTypeInfo();
    info.arrayMap.set("verifierRoutes", new VerifierSourceRouteCredentials());
    return info;
  }

  getSourceConfig(sourceId: number) {
    const sourceName = getSourceName(sourceId);
    for (let config of this.verifierRoutes) {
      if (config.sourceId === sourceName) {
        return config;
      }
    }
    return null;
  }
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